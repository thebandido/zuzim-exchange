const redis = require("redis");

class Redis {
    constructor() {
        this.createClient();
        console.log("Redis - constructor");
    }

    createClient() {
        console.log("createClient");
        this.redis = redis.createClient({
            path: "/var/run/redis/redis.sock"
        });

        this.redis.on("error", (err) => {
            console.log("Error " + err);
        });

        this.redis.on("end", () => {
            this.createClient();
            console.log("end ");
        });
    }

    setData(curr, value) {
        console.log("Redis - setData");
        this.redis.set(curr, value);
        //     () => {
        //     this.redis.get(curr, function (error, result) {
        //         if (error) {
        //             console.log(error);
        //             throw error;
        //         }
        //         console.log('GET result! '+curr+' ->' + result);
        //     });
        // }
    }

    getData(curr) {
        return new Promise((res, rej) => {
            this.redis.get(curr, (error, result) => {
                if (error) {
                    rej(error)
                }
                res(result)
            })
        })
    }

}

module.exports = Redis;