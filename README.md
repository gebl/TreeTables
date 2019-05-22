# TreeTables plug-in for jQuery
TreeTables is a jQuery plugin that enhances the functionality of the
popular [DataTables](https://github.com/DataTables/DataTables) plugin.

DataTables does not support tree data by default, so this plugin adds
that support.

## Installation options
1. Download:
    First download the base DataTables scripts here: https://datatables.net/download/
    Then also download this repo and include the following scripts on your page:

    ```
    <script type="text/javascript" src="DataTables/datatables.min.js"></script>
    <script type="text/javascript" src="treeTable.js"></script>
    ```

    And the following css in your document head:
    ```
    <link rel="stylesheet" type="text/css" href="DataTables/datatables.min.css"/>
    <link rel="stylesheet" type="text/css" href="tree-table.css"/>
    ```

2. npm: `npm install @reside-ic/tree-table`

## Basic Usage

```
 const organisationData = [
            {key: 1, parent: 0, name: "CEO"},
            {key: 2, parent: 1, name: "CTO"},
            {key: 3, parent: 2, name: "developer"},
            {key: 4, parent: 1, name: "CFO"}
        ];

        $('#my-table').treeTable({
            "data": myData,
            "columns": [
                {
                    "data": "name"
                }
            ]
        });
```

Data provided to the table must include the following fields:
* key: number - a unique row identifier
* parent: number - the key of this row's parent row

## Options
TreeTable options are all DataTable options plus:
* collapsed: bool - whether to start with all child rows collapsed

```
        $('#my-table').treeTable({
            "data": myData,
            "collapsed": true,
            "columns": [
                {
                    "data": "name"
                }
            ]
        });
```

Please note that the TreeTable plugin adds a left-hand column to the table.
So *user provided columns are 1-indexed instead of 0-indexed*.

E.g., this table will be initially sorted by name:


```
        $('#my-table').treeTable({
            "data": myData,
            "columns": [
                {
                    "data": "name"
                },
                {
                    "data": "salary"
                }
            ],
            "order": [[ 1, 'asc' ]]
        });
```


## API
The datatables API will be attached to the table element in the usual way,
accessible by ```$('#my-table').DataTable()```

Please note that as with the options, columns are 1-indexed. E.g. to re-sort the
above table by salary:

```
 $('#my-table').DataTable().order([ 2, 'asc' ])
 ```

### Thanks
The approach used here was inspired by a [jsfiddle](http://jsfiddle.net/hcke44hy/8)
posted by a user called Mytko in the datatables forum:
https://datatables.net/forums/discussion/25045/treetable-in-datatables
