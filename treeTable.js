(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery', 'datatables.net'], function ($, dt) {
            return factory(dt.$, window, document);
        });
    } else if (typeof exports === 'object') {
        // CommonJS
        module.exports = function (root, $) {
            if (!root) {
                root = window;
            }

            if (!$ || !$.fn.dataTable) {
                $ = require('datatables.net')(root, $).$;
            }

            return factory($, root, root.document);
        };
    } else {
        // Browser
        factory(jQuery, window, document);
    }
}(function ($) {

    function getPath(a) {
        if (typeof a.parent !== 'undefined') {
            result = getPath(a.parent);
        } else {
            result = new Array();
        }
        result.push(a);
        return result;
    }

    function logPath(apath) {
        a = "";
        for (i = 0; i < apath.length; i++) {
            a = a + "/" + apath[i].key;
        }
        return a;
    }

    function compareObjectDesc(a, b) {
        if (!a || !b) {
            return 0
        }

        apath = getPath(a);
        bpath = getPath(b);

        min = Math.min(apath.length, bpath.length);
        res = 0;
        
        for (i = 0; i < min; i++) {
            if (apath[i].key != bpath[i].key) {
                res = ((apath[i].val < bpath[i].val) ? 1 : ((apath[i].val > bpath[i].val) ? -1 : 0));
                if (res==0) {
                    res = ((apath[i].key < bpath[i].key) ? 1 : ((apath[i].key > bpath[i].key) ? -1 : 0));
                }
                break;
            }
        }
        
        if (!a.hasChild && !b.hasChild && typeof a.parent !== 'undefined' && typeof b.parent !== 'undefined' && a.parent.key == b.parent.key) {
            res = ((a.val < b.val) ? 1 : ((a.val > b.val) ? -1 : 0));
        }
        return res;
    }

    function compareObjectAsc(a, b) {
        if (!a || !b) {
            return 0
        }
        apath = getPath(a);
        bpath = getPath(b);
        min = Math.min(apath.length, bpath.length);
        res = 0;
        
        for (i = 0; i < min; i++) {
            if (apath[i].key != bpath[i].key) {
                res = ((apath[i].val < bpath[i].val) ? -1 : ((apath[i].val > bpath[i].val) ? 1 : 0));
                if (res==0) {
                    res = ((apath[i].key < bpath[i].key) ? -1 : ((apath[i].key > bpath[i].key) ? 1 : 0));
                }
                break;
            }
        }
        
        if (!a.hasChild && !b.hasChild && typeof a.parent !== 'undefined' && typeof b.parent !== 'undefined' && a.parent.key == b.parent.key) {
            res = ((a.val < b.val) ? -1 : ((a.val > b.val) ? 1 : 0));
        }
        return res;
    }

    function level(self, key) {
        if (typeof self.dataDict[key] === 'undefined') {
            return 1
        }

        const parentKey = self.dataDict[key][self['parentRowId']];
        return 1 + level(self, parentKey);
    }

    function hasParent(self, key, parentRegex) {
        const rowData = self.dataDict[key];
        const p = rowData[self['parentRowId']];
        if (typeof self.dataDict[p] === 'undefined') return false;
        if (parentRegex.test(p.toString())) return true;
        return hasParent(self, p, parentRegex);
    }


    function buildOrderObject(self, keyRowId, parentRowId, coldata, full) {

        let current = {
            'key': full[keyRowId],
            'val': full[coldata],
            'hasChild': full['hasChild']
        }
        let parent = self.dataDict[full[parentRowId]];
        if (typeof parent !== 'undefined') {
            parent = buildOrderObject(self, keyRowId, parentRowId, coldata, self.dataDict[full[parentRowId]]);
            current['parent'] = parent;
        }
        return current;
    }

    function buildSearchObject(self, key, col, data) {
        const children = self.dataDict[key].children;
        return [data].concat(children.map((c) => {
            return buildSearchObject(self, c[self['keyRowId']], col, c[col])
        }));
    }

    if (!$.fn.dataTable) throw new Error('treeTable requires datatables.net');

    $.fn.dataTableExt.oSort['tt-asc'] = function (a, b) {
        return compareObjectAsc(a, b);
    };

    $.fn.dataTableExt.oSort['tt-desc'] = function (a, b) {
        return compareObjectDesc(a, b);
    };

    function createDataDict(self, data) {
        return data.reduce(function (map, obj) {
            obj.children = data.filter((d) => d[self['parentRowId']] === obj[self['keyRowId']]);
            obj.hasChild = obj.children.length > 0;
            map[obj[self['keyRowId']]] = obj;
            return map;
        }, {});
    }

    const TreeTable = function (element, options) {
        const self = this;
        this.$el = $(element);

        if (typeof options.tt_parent === 'undefined') {
            options.tt_parent = "tt_parent";
        }
        if (typeof options.tt_key === 'undefined') {
            options.tt_key = "tt_key";
        }

        if (options.data) {
            this.init(options);
        } else if (options.ajax) {
            // here create a dummy DataTable using the provided ajax source so that we can use
            // DataTables internal logic to retrieve json and handle any ajax errors
            this.$dummy = $("<table></table>");
            this.$dummyWrapper = $('<div id="dummy-wrapper" style="display:none"></div>');

            $("body").append(this.$dummyWrapper);
            this.$dummyWrapper.append(this.$dummy);
            this.$dummy.DataTable({
                ajax: options.ajax,
                columns: options.columns
            });

            this.$dummy.on('xhr.dt', function (e, settings, json, xhr) {
                self.$dummy.DataTable().destroy();
                self.$dummy.parent().remove();
                if (json != null) {
                    // calling this internal method retrieves data from the json in accordance with
                    // provided DataTable ajax options - https://datatables.net/reference/option/ajax
                    options.data = $.fn.dataTableExt.internal._fnAjaxDataSrc(settings, json);
                    options.ajax = null;
                    self.init(options);
                }
            });
        }
    };

    TreeTable.prototype.init = function (options) {
        const self = this;
        this.parentRowId = options.tt_parent;
        this.keyRowId = options.tt_key;

        this.collapsed = new Set([]);

        this.data = options.data;
        this.dataDict = createDataDict(self, options.data);

        this.displayedRows = [];

        this.dt = null;

        const initialOrder = options.order;
        options.order = [];
        options.columns = options.columns || [];
        options.columns.map((col) => {
            const oldRender = col.render;
            col.render = function (data, type, full, meta) {
                switch (type) {
                    case "sort":
                        result = buildOrderObject(self, self['keyRowId'], self['parentRowId'], col["data"], full);
                        return result;
                    case "filter":
                        return buildSearchObject(self, full[self['keyRowId']], col["data"], data);
                    default:
                        return oldRender ? oldRender(data, type, full, meta) : data;
                }
            };
            col.type = "tt";
        });

        options.rowId = options.tt_key;

        this.$el.find("thead tr").prepend("<th></th>");

        options.columns = [{
            "class": "tt-details-control",
            "orderable": false,
            "data": null,
            "defaultContent": "<div class='expander'></div>",
            "width": 50
        }].concat(options.columns);

        options.createdRow = function (row, data) {
            let cssClass = "";
            if (self.dataDict[data[self.keyRowId]].hasChild) {
                cssClass += " has-child ";
            }
            if (data['tt_parent'] > 0) {
                cssClass += " has-parent";
            }

            cssClass += " level-" + (level(self, data[self.keyRowId]) - 2);
            $(row).addClass(cssClass);
        };

        this.dt = this.$el.DataTable(options);

        if (initialOrder) {
            this.dt.order(initialOrder);
        }

        if (options.collapsed) {
            this.collapseAllRows();
        } else {
            this.expandAllRows();
        }

        this.$el.find('tbody').on('click', 'tr.has-child td.tt-details-control', function () {
            self.toggleChildRows($(this).parent("tr"))
        });

        this.redraw();
    };

    TreeTable.prototype.toggleChildRows = function ($tr) {
        console.log("toggleChildRows");
        const row = this.dt.row($tr);
        const key = row.data()[this['keyRowId']];

        if (this.collapsed.has(key)) {
            this.collapsed.delete(key);
            $tr.addClass('open');
        } else {
            this.collapsed.add(key);
            $tr.removeClass('open');
        }

        this.redraw();
    };

    TreeTable.prototype.collapseAllRows = function () {

        this.data.map((d) => {
            if (this.dataDict[d[this['keyRowId']]].hasChild) {
                this.collapsed.add(d[this['keyRowId']]);
            }
        });

        this.$el.find("tbody tr.has-child").removeClass("open");
        return this
    };

    TreeTable.prototype.expandAllRows = function () {
        this.collapsed = new Set([]);
        this.$el.one('draw.dt', () => {
            this.$el.find("tbody tr.has-child").addClass("open");
        });
        return this
    };

    TreeTable.prototype.redraw = function () {
        $.fn.dataTable.ext.search = $.fn.dataTable.ext.search.filter((it, i) => it.name !== "ttExpanded");

        if (this.collapsed.size === 0) {
            this.displayedRows = this.dt.rows().eq(0);
            this.dt.draw();
            return
        }

        let regex = "^(0";
        this.collapsed.forEach(function (value) {
            regex = regex + "|" + value;
        });
        regex = regex + ")$";
        const parentRegex = new RegExp(regex);

        this.displayedRows = this.dt.rows((idx, data) => {
            return !hasParent(this, data[this['keyRowId']], parentRegex)
        }).eq(0);

        const self = this;
        const ttExpanded = function (settings, data, dataIndex) {
            return self.displayedRows.indexOf(dataIndex) > -1
        };

        $.fn.dataTable.ext.search.push(ttExpanded);
        this.dt.sort();
        this.dt.draw();
    };

    TreeTable.DEFAULTS = {};

    const old = $.fn.treeTable;

    $.fn.treeTable = function (option) {
        return this.each(function () {
            const $this = $(this);
            let data = $this.data('treeTable');
            const options = $.extend({}, TreeTable.DEFAULTS, typeof option === 'object' && option);

            if (!data) $this.data('treeTable', (data = new TreeTable(this, options)));

        });
    };


    $.fn.treeTable.Constructor = TreeTable;

    $.fn.treeTable.noConflict = function () {
        $.fn.treeTable = old;
        return this;
    };
}));