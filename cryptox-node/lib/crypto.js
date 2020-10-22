const {take, filter, map, throttleTime} = require('rxjs/operators');

const Redis = require('./redis');
const Socket = require('./socket');

const bitfinex = require('./crypto/bitfinex');
const binance = require('./crypto/binance');

const cryptoCurrency = [bitfinex, binance];
const cryptoCurrencyDefault = 0;

let setCurrency = -1;
let subscribe;

class Crypto {
    constructor() {
        this.socket = null;
        this.platform = null;
        this.redis = new Redis();

        this.start();
    }

    start() {
        this.setPlatform();
        this.connectToCourses();
    }

    setPlatform() {
        setCurrency++;

        if (this.socket) {
            this.socket.close();
        }
        this.socket = new Socket();

        if (cryptoCurrency.length <= setCurrency) {
            setCurrency = 0;
        }

        console.log("setPlatform", setCurrency);
        this.platform = new cryptoCurrency[setCurrency](this.socket);
    }

    checkDefault() {
        const socket = new Socket(),
            platform = new cryptoCurrency[cryptoCurrencyDefault](socket);

        let subs = platform.start().subscribe((obj) => {
            console.log("throttleTime");

            if (subscribe) {
                subscribe.unsubscribe();
            }

            if (subs) {
                subs.unsubscribe();
            }

            setCurrency = -1;
            this.start();
        }, (error) => {
            setTimeout(() => {
                this.checkDefault()
            }, 10000);
            console.log(error);
        }, () => {
            setTimeout(() => {
                this.checkDefault()
            }, 10000);
        });
    }

    connectToCourses() {
        console.log(setCurrency, cryptoCurrencyDefault);
        if (setCurrency != cryptoCurrencyDefault) {
            this.checkDefault();
        }

        subscribe = this.platform.start().subscribe((obj) => {
                // console.log(obj, "asdada", setCurrency);
                this.redis.setData(obj.curr, obj.ticker);
            },
            () => {
                subscribe = null;
                this.start();
            },
            () => {
                subscribe = null;
                this.start();
            },
        );
    }
}

module.exports = Crypto;