const {throttleTime, filter, map} = require('rxjs/operators');
const CryptoCurrency = require('./cryptoCurrency');

class Binance extends CryptoCurrency {
    constructor(socket) {
        super(socket);
        this.coursesUrl = 'wss://stream.binance.com:9443/ws/!ticker@arr';

        // this.currencies.forEach(value => {
        //     value = `BTC${value}`;
        //     value = value.toLocaleLowerCase() + '/';
        //     this.coursesUrl += value
        // });
        // this.coursesUrl = this.coursesUrl.slice(0, -1) + '@miniTicker';
        console.log(this.coursesUrl);
    }

    connectToCourses(observer) {
        console.log('Binary');
        this.socket.connect(this.coursesUrl)
            .subscribe(
                () => {
                },
                () => {
                    observer.error({
                        'type': 'connect'
                    });
                },
                () => {
                    observer.complete();
                }
            );

        let tickerBTC;
        this.socket.onMessage()
            .pipe(
                map(ev => {
                    ev = JSON.parse(ev);
                    ev.map((ev) => {
                        let curr,
                            ticker;
                        switch (ev.s) {
                            case 'BTCUSDT':
                                curr = 'BTC';
                                ticker = ev.a;
                                tickerBTC = ticker;
                                break;
                            case 'ETHUSDT':
                                ticker = ev.a;
                                curr = 'ETH';
                                break;
                            case 'ZECBTC':
                                ticker = ev.a * tickerBTC;
                                curr = 'ZEC';
                                break;
                            case 'DASHBTC':
                                ticker = ev.a * tickerBTC;
                                curr = 'DSH';
                                break;
                        }

                        if (curr) {
                            observer.next({
                                'curr': curr,
                                'ticker': +(ticker)
                            });
                        }
                    });

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
                },
                (error) => {
                    observer.error({
                        'name':'Binance',
                        'type': 'error',
                        'error': error
                    });
                },
                () => {
                    observer.complete();
                });
    }

    // subscribeToCourses() {
    //     this.currencies.forEach(value => {
    //         value += 'USD';
    //         this.socket.emit(JSON.stringify({
    //             stream: `!ticker@arr`
    //         }));
    //     })
    // }
}

module.exports = Binance;