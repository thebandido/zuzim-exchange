const rx = require('rxjs');

class Server{

    constructor(httpsServer){
        this.httpsServer = httpsServer;

        this.routes = {
            currency: '/currency'
        };
    }

    subscribeToRequests(url){
        return new rx.Observable(observer => {
            this.httpsServer.get(url, (req, res) => {
                observer.next({req, res})
            })
        })
    }
}

module.exports = Server