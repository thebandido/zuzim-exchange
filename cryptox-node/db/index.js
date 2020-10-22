// This file handles the configuration of the app.
// It is required by app.js
var Promise = require('promise');
var mysql = require('mysql');
var moment = require('moment');
var Model = require('./model.js');

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    // password: 'test123',
    password: 'xbHZC74KVDPvyP8A',
    database: 'crypto'
});

module.exports = {

    createDialog: function (chat_id, operator_id, admin_id) {
        var newDialog = [],
            this_ = this;
        return this_.getDialog(chat_id)
            .then(function (dialog) {
                newDialog = dialog[0];
                return this_.addUserToDialog(operator_id, newDialog.id)
            })
            .then(function (status) {
                return this_.addUserToDialog(admin_id, newDialog.id)
            })
            .then(function () {
                return newDialog.id;
            })
            .catch(function (err) {
                console.log(err);
            });
    },

    getTransaction: function (transaction_id) {
        return new Promise(function (resolve, reject) {
            connection.query('SELECT * FROM app_transaction WHERE id = ?', [transaction_id], function (_err, _result) {
                if (_err) reject(_err);

                resolve(_result);
            })
        })
    },

    getDialog: function (chat_id) {
        return new Promise(function (resolve, reject) {

            var query = new Model('dialog')
                .where(['=', 'dialog.chat_id', chat_id])
                .limit(1);

            connection.query(query.getSql(), function (error, results, fields) {
                if (error) reject(error);

                if (results && !results.length) {
                    var dialog = {
                        status: 0,
                        chat_id: chat_id
                    };

                    connection.query('INSERT INTO dialog SET ?', dialog, function (err, result) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        connection.query(query.getSql(), function (error, results, fields) {
                            if (error) reject(error);

                            resolve(results);
                        })
                    });
                } else {
                    resolve(results);
                }
            });
        });
    },

    addUserToDialog: function (user_id, dialog_id) {
        return new Promise(function (resolve, reject) {
            var post = {
                user_id: user_id,
                dialog_id: dialog_id
            };

            connection.query('SELECT * FROM dialog_user WHERE user_id = ? AND dialog_id = ?', [user_id, dialog_id], function (_err, _result) {
                if (_result.length) {
                    resolve(user_id);
                    return;
                }

                connection.query('INSERT INTO dialog_user SET ?', post, function (_err, _result) {
                    if (_err) {
                        reject(_err);
                        return;
                    }
                    resolve(user_id);
                });
            });
        });
    },

    getUsersFromDialog: function (dialog_id, options) {
        return new Promise(function (resolve, reject) {

            var limit = options.limit || 20;
            var query = new Model('app_user')
                .select([
                    'app_user.username'
                ])
                .join('dialog_user', '(dialog_user.user_id = app_user.id)')
                .where(['=', 'dialog_user.dialog_id', dialog_id])
                .groupBy('dialog_user.user_id')
                .orderBy('dialog_user.user_id DESC')
                .limit(limit);

            connection.query(query.getSql(), function (error, results, fields) {

                if (error) {
                    reject(error);
                    return;
                }

                resolve(results);
            })
        });
    },

    saveMessage: function (user_id, message) {
        var this_ = this;
        return new Promise(function (resolve, reject) {
            var now = moment().format('YYYY-MM-DD HH:mm:ss');

            var post = {
                user_id: user_id,
                dialog_id: message.dialog_id,
                message: message.text,
                status: 0,
                date_create: now
            };

            connection.query('INSERT INTO messages SET ?', post, function (_err, _result) {
                if (_err) {
                    reject(_err);
                    return;
                }

                resolve({dialog_id: message.dialog_id, message_id: _result.insertId});
            });
        });
    },

    getMessages: function (dialog_id) {
        return new Promise(function (resolve, reject) {

            var query = new Model('messages')
                .select(['distinct messages.*', 'app_user.username'])
                .join('dialog_user', '(dialog_user.dialog_id = messages.dialog_id)')
                .join('app_user', '(app_user.id = messages.user_id)', 'LEFT JOIN')
                .where(['=', 'messages.dialog_id', dialog_id])
                .orderBy('messages.id ASC');

            query = connection.query(query.getSql(), function (error, results, fields) {

                if (error) {
                    reject(error);
                    return;
                }

                var res = [];
                for (var i = 0; i < results.length; i++) {
                    res.push({
                        'user': {
                            'user_id': results[i].user_id,
                            'username': results[i].username
                        },
                        'messages': {
                            'id': results[i].id,
                            'dialog_id': results[i].idDialog,
                            'message': results[i].message,
                            'status': results[i].status,
                            'date_create': results[i].date_create,
                            'date_read': results[i].date_read
                        }
                    });
                }
                resolve(res);
            });
        });
    },

    countUnreadRooms: function (user_id) {
        return new Promise(function (resolve, reject) {

            var query = new Model('messages')
                .select(['dialog_user.dialog_id as dialog_id', 'COUNT(distinct dialog.id) as count', 'MAX(messages.id) AS max_id'])
                .join('dialog_user', '(dialog_user.dialog_id = messages.dialog_id)')
                .join('dialog', '(dialog_user.dialog_id = dialog.id)')
                .where(['=', 'dialog_user.user_id', user_id])
                .where(['<>', 'dialog_user.status', 0])
                //          .where(['<>', 'messages.user_id', user_id])
                //          .where(['=', 'messages.status', 0])
                .groupBy('dialog_user.dialog_id')
                .orderBy('dialog_user.dialog_id DESC');

            connection.query(query.getSql(), function (error, results, fields) {
                if (error) {
                    reject(error);
                    return;
                }

                var res = {
                    'count': 0,
                    'messages': null
                };

                for (var i = 0; i < results.length; i++) {
                    res.count += results[i].count;

                    if (res.messages) {
                        if (res.messages.id < results[i].max_id) {
                            res.messages = {
                                id: results[i].max_id,
                                dialog_id: results[i].dialog_id,
                            };
                        }
                    } else {
                        res.messages = {
                            id: results[i].max_id,
                            dialog_id: results[i].dialog_id,
                        };
                    }
                }

                resolve(res);
            });
        });
    },

    updateMessageStatus: function (user_id, message_id, dialog_id, status) {
        return new Promise(function (resolve, reject) {
            connection.query('UPDATE messages SET status = ?, date_read = ? WHERE id <= ? and user_id <> ? and dialog_id = ?',
                [status, moment().format('YYYY-MM-DD HH:mm:ss'), message_id, user_id, dialog_id], function (_err, _result) {
                    if (_err) {
                        reject(_err);
                        return;
                    }

                    resolve(status);
                });
        });
    },

    checkTransactionInProgress: function (user_id) {
        return new Promise(function (resolve, reject) {

            connection.query('SELECT app_transaction.id, app_transaction.operator_id, app_transaction.admin_id FROM app_transaction ' +
                'inner join dialog on dialog.chat_id = app_transaction.id ' +
                'WHERE app_transaction.status = 1 ' +
                'and dialog.status = 0 and created_at < NOW() - INTERVAL 20 MINUTE', function (error, results, fields) {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(results);
            });
        });
    },

    updateDialog: function (dialog_id, status) {
        return new Promise(function (resolve, reject) {

            connection.query('UPDATE dialog SET status = ? WHERE id = ?',
                [status, dialog_id], function (_err, _result) {
                    if (_err) {
                        reject(_err);
                        return;
                    }

                    resolve(dialog_id);
                });
        })
    },

    updateTransactionStatus: function (dialog_id, user_id, status) {
        return new Promise(function (resolve, reject) {
            var now = moment().format('YYYY-MM-DD HH:mm:ss');

            connection.query('UPDATE dialog_user SET status = ?, updated_at = ? WHERE dialog_id = ? and user_id = ?',
                [status, now, dialog_id, user_id], function (_err, _result) {
                    if (_err) {
                        reject(_err);
                        return;
                    }

                    resolve(dialog_id);
                });
        })
    },
    getRoommates: function (user_id, room_id) {
        return new Promise(function (resolve, reject) {

            var query = new Model('dialog_user')
                .select(['dialog_user.user_id as user_id'])
                .join('dialog', '(dialog_user.dialog_id = dialog.id)')
                .where(['=', 'dialog.chat_id', room_id])
                .where(['<>', 'dialog_user.user_id', user_id])
                .orderBy('dialog_user.dialog_id DESC');

            connection.query(query.getSql(), function (error, results, fields) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(results);
            });
        });
    }
};
