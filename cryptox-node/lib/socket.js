const rx = require('rxjs');
const WebSocket = require('ws')


class Socket {

    constructor() {
        this.socket = null;
    }

    connect(url) {
        return new rx.Observable(observer => {
            this.socket = new WebSocket(url);
            this.socket.onopen = () => {
                observer.next()
                observer.complete()
            };
            this.socket.onerror = (err) => {
                observer.error(err)
            };
        });
    }

    onMessage() {
        return new rx.Observable(observer => {
            this.socket.onmessage = (ev) => {
                observer.next(ev.data)
            };
            this.socket.onerror = (err) => {
                observer.error(err)
            };
            this.socket.onclose = () => {
                observer.complete()
            };
        });
    }

    emit(data) {
        this.socket.send(data);
    }

    close() {
        this.socket.close();
    }
}

module.exports = Socket;