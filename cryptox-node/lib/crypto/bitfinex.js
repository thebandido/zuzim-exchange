const {throttleTime, filter, map} = require('rxjs/operators');
const CryptoCurrency = require('./cryptoCurrency');

class Bitfinex extends CryptoCurrency {
    constructor(socket) {
        super(socket);
        this.coursesUrl = 'wss://api.bitfinex.com/ws/2';
    }

    connectToCourses(observer) {
        console.log('Bitfinex');

        this.socket.connect(this.coursesUrl)
            .subscribe(
                () => {
                    this.subscribeToCourses();
                },
                () => {
                    observer.error({
                        'type': 'connect'
                    });
                },
            );

        this.socket.onMessage()
            .pipe(
                map(ev => {
                    ev = JSON.parse(ev);
                    if (!Array.isArray(ev) && ev.event === 'subscribed') {
                        this.currCodes[ev.chanId] = ev.pair.slice(-6, -3);
                    } else if (Array.isArray(ev)) {
                        const curr = this.currCodes[ev[0]];
                        const ticker = ev[1][ev[1].length - 4];

                        if (ticker) {
                            observer.next({
                                'curr': curr,
                                'ticker': +(ticker)
                            });
                        }
                    }
                }),
                filter(ev => ev),
                throttleTime(1000)
            )
            .subscribe(({curr, latestBid}) => {
                    const closeBid = latestBid[2];
                    if (curr && +closeBid) {
                        observer.next({
                            'curr': curr,
                            'ticker': +(closeBid)
                        });
                    }
                }, (error) => {
                    observer.error({
                        'name':'Bitfinex',
                        'type': 'error',
                        'error': error
                    });
                },
                () => {
                    observer.complete();
                });
    }

    subscribeToCourses() {
        this.currencies.forEach(value => {
            this.socket.emit(JSON.stringify({
                event: 'subscribe',
                channel: 'ticker',
                pair: `${value}USD`
            }));
        })
    }
}

module.exports = Bitfinex;