var CronJob = require('cron').CronJob;
var db = require('../db');

module.exports = function(app, io) {
    var io_ = io;
    var message = {};
    var checkingUnreadRooms = new CronJob('0 * * * * *', function () {
            db.checkTransactionInProgress()
                .then(function (transactions) {
                    transactions.forEach(function(transaction) {
                        db.createDialog(transaction.id, transaction.operator_id, transaction.admin_id)
                            .then(function(res) {
                                message = {
                                    dialog_id: res,
                                    text: 'Внимание! \n\rАдминистратор не реагирует на ваши сообщения, свяжитесь с ним другим возможным способом!'
                                };
                                return db.saveMessage(transaction.operator_id, message);
                            })
                            .then(function(res) {
                                return db.updateDialog(res.dialog_id, 1);
                            })
                            .then(function(res) {
                                return db.getMessages(res);
                            })
                            .then(function(messages) {
                                io_.to(message.dialog_id).emit('receive', {
                                    msg: message.text,
                                    // user: transaction.operator_id,
                                    user: transaction.admin_id,
                                    messages: messages,
                                    attention: true});
                            })
                            .catch(function(err) {
                                console.log(err);
                            })
                    });
                })
                .catch(function(err) {
                    console.log(err);
                });
        }, function (err) {
            console.log("Cron stops - ", err);
        },
        true
    );

};