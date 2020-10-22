const rx = require('rxjs');

class CryptoCurrency {
    constructor(socket) {
        this.socket = socket;
        this.currCodes = {};
        this.currencies = ['BTC', 'DSH', 'ETH', 'ZEC', 'USDT'];
    }

    start() {
        return new rx.Observable(observer => {
            this.connectToCourses(observer);
        });
    }
}

module.exports = CryptoCurrency;