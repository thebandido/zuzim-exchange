/**
 * Created by artem on 30.05.17.
 */

var method = Sql.prototype;

function Sql(from) {
    this._select = ['*'];
    this._from = from;
    this._orderBy = 'id DESC';
    this._groupBy = null;
    this._where = null;
    this._join = '';
    this._limit = 0;

    return this;
}

method.select = function (select) {
    this._select = select;
    return this;
};

method.from = function (from) {
    this._from = from;
    return this;
};

method.join = function (join, on, type) {
    type = type || "INNER JOIN";
    this._join += type + ' ' + join + " ON " + on + " ";
    return this;
};

method.where = function (where, params) {
    params = params || "and";
    if (!this._where) {
        this._where = where[1] + " " + where[0] + " " + where[2];
    } else {
        this._where = "(" + this._where + ") " + params + " " + where[1] + " " + where[0] + " " + where[2];
    }
    return this;
};

method.whereClear = function () {
    this._where = null;
    return this;
};

method.groupBy = function (groupBy) {
    this._groupBy = groupBy;
    return this;
};

method.orderBy = function (orderBy) {
    this._orderBy = orderBy;
    return this;
};

method.limit = function (limit) {
    this._limit = limit;
    return this;
};

method.getSql = function () {
    var sql = 'SELECT ';
    var lng = this._select.length;

    for (var i = 0; i < lng; i++) {
        sql += this._select[i];
        if (i < lng - 1) {
            sql += ",";
        }
        sql += " ";
    }

    sql += 'FROM ' + this._from + " ";

    if (!!this._join) {
        sql += this._join + " ";
    }

    if (!!this._where) {
        sql += 'WHERE ' + this._where + " ";
    }

    if (!!this._groupBy) {
        sql += 'GROUP BY ' + this._groupBy + " ";
    }

    if (!!this._orderBy) {
        sql += 'ORDER BY ' + this._orderBy + " ";
    }
    if (!!this._limit) {
        sql += 'LIMIT ' + this._limit;
    }
    
    return sql;
};

module.exports = Sql;