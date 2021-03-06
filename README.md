# carmen

[UTFGrid](https://www.mapbox.com/developers/utfgrid/)/[MBTiles](https://www.mapbox.com/mbtiles-spec/)-based
geocoder with support for swappable data sources.

This is an implementation of some of the concepts of [Error-Correcting Geocoding](http://arxiv.org/abs/1102.3306)
by [Dennis Luxen](http://algo2.iti.kit.edu/english/luxen.php).

[![Build Status](https://secure.travis-ci.org/mapbox/carmen.png)](https://travis-ci.org/mapbox/carmen)

## Depends

 - Node v0.8.x or Node v0.10.x
 - sqlite3 command line program (`apt-get install sqlite3`)
 - libprotobuf-lite and protoc compiler
 - C++11 capable compiler (>= g++ 4.7 or >= clang 3.2)

## Install

Linux / apt:

    sudo add-apt-repository ppa:ubuntu-toolchain-r/test
    sudo apt-get update
    sudo apt-get install gcc-4.7 g++-4.7 libprotobuf7 libprotobuf-dev protobuf-compiler
    export CC=gcc-4.7
    export CXX=g++-4.7

OSX / homebrew:

    brew install protobuf

All:

    npm install && ./scripts/install-dbs.sh

Note: if running as `root` user you need to do `npm install --unsafe-perm` to avoid `cannot run in wd carmen@0.1.0` error that prevents the build.

Installs dependencies and downloads the default tiles indexes (about 1GB of data).

## Usage

    npm start

Runs an example geocoding server at `http://localhost:3000`.

## Tests

Install, and then

    npm test

## Example

```js
var Carmen = require('carmen');
var carmen = new Carmen(options /*see below for details on options*/);
carmen.geocode('Washington, DC', function(err, data) {
    console.log(data);
});
```

## API

### new Carmen(options)

Create a new Carmen object. Takes a hash of index objects to use, keyed by
each `id`. Each index object should resemble the following:

```js
{
  // Required. MBTiles instance to be used.
  source: new MBTiles('./myindex.mbtiles'),

  // Optional. Set to `false` to skip this index for token queries.
  query: true,

  // Optional. Set to `false` to exclude this index from contexts.
  context: true,

  // Optional. Search weight. Higher = greater priority.
  weight: 2,

  // Optional. Return a value to break ties between results. Higher values beat lower.
  sortBy: function(data) { return data.myKey; },

  // Optional. Token filter. Return false to skip querying this index.
  filter: function(token) { return true; },

  // Optional. Map the feature data to a different output format.
  map: function(data) { return data; }
}
```

### carmen.geocode([string], callback)

Geocode a string query. The result is passed to `callback(err, data)` in the following form:

```js
{
  query: ['washington', 'dc'],
  results: [
    [
      {
        lat: 38.8951148,
        lon: -77.0363716000006,
        name: 'Washington',
        type: 'city'
      },
      {
        lat: 38.9108045088125,
        lon: -77.0096131357235,
        name: 'District of Columbia',
        type: 'province'
      },
      {
        lat: 51.1974842447091,
        lon: -119.265098284354,
        name: 'United States of America',
        type: 'country'
      }
    ]
  ]
}
```

Each array in `results` contains a match for the query, where the first feature
in each match contains the matching element and subsequent elements describe
other geographic features containing the first element.

`carmen.geocode()` can also be called with a pair of coordinates in the form
`lon,lat` to do "reverse" geocoding. The result data is identical for a reverse geocoding query.

### carmen.context(longitude: number, latitude: number, maxtype, callback: function)

Reverse-geocode a point on the earth, calling `callback` with `(err, results)`

Results are a list of places in the form:

```json
[
  {
    "bounds": [
      -80.0100559999999,
      37.978863,
      -79.9505769999999,
      38.0010829999999
    ],
    "lat": 37.9864357468642,
    "lon": -79.9800636337067,
    "name": "Bolar",
    "score": 2112180.24540208,
    "type": "place",
    "id": "place.154513"
  }
]
```

### carmen.index(source: tilelive source, docs: array, callback: function)

Given `source` as a tilelive source, `docs` as an array of documents to index,
and `callback` being called with `(err)` argument indicating any errors,
use Carmen to write a new geocodable index to the source.

## Indexes

Each carmen index is an MBTiles file with an additional SQLite fulltext search table `carmen`. The table can be added by running

    ./scripts/carmen-index.js MBTILES

The only requirement for a carmen MBTiles file is that it contains grids and
features with a field suitable for use as search terms. Any additional keys
included with features will be automatically passed through to the results.
The following fields have special meaning to carmen if present:

- `search` - text to be indexed for forward geocoding.
- `lon` - longitude of the feature. If omitted, `lon` is calculated from the UTFGrid.
- `lat` - latitude of the feature. If omitted, `lat` is calculated from the UTFGrid.
- `type` - type of feature. If omitted, the index key is used.
- `score` - numeric score. If present, used by the default `sortBy` function to sort results.
- `bounds` - comma-separated coordinates that bound the feature in order: w,s,e,n. If present, carmen will split and format this field into an array of values.

Note that the UTFGrid-based centroid calculation for polygon features is
currently very rough. Providing a more accurate lon/lat pair for these
features is more performant and recommended.

### Designing for carmen in TileMill

Here are some guidelines if you are creating an MBTiles specifically for carmen in TileMill:

- Only the highest zoom level of an MBTiles is used by carmen. To save on disk space and render time you will probably want to export only the highest zoom level of your map.
- Since carmen uses the rendered UTFGrid you should ensure that the zoom level of your map is high enough to get the precision you need. 
- The field you use for search terms (by default `search`) can contain comma separated "synonyms". For example, a value of `United States, America` will allow searches for either `United States` or `America` to both match the same feature.
- Image tiles in your MBTiles can be helpful for debugging but are not strictly necessary. To remove them and reclaim space:

        sqlite3 [mbtiles] "DELETE FROM images; UPDATE map SET tile_id = NULL; VACUUM;"

## Default indexes

Four index files (country/province/place/zipcode) are provided by default with carmen. Their TileMill projects are available in the `data` branch.

- `ne-countries` - countries, from Natural Earth. Public domain.
- `ne-provinces` - provinces, from Natural Earth. Public domain.
- `osm-places` - places (cities/towns/villages/etc.), OpenStreetMap and contributors. CC-by-SA.
- `tiger-zipcodes`- US zipcodes, from TIGER. Public domain.

Two other projects are available in the `data` branch:

- `flickr-places` - places (localities), from Flickr. Public domain.
- `tiger-places` - places (cities/towns/villages/etc.), from TIGER. Public domain.

Fully rendered and indexed copies of these sources can be downloaded at:

    http://mapbox-carmen.s3.amazonaws.com/carmen/flickr-places.mbtiles
    http://mapbox-carmen.s3.amazonaws.com/carmen/ne-countries.mbtiles
    http://mapbox-carmen.s3.amazonaws.com/carmen/ne-provinces.mbtiles
    http://mapbox-carmen.s3.amazonaws.com/carmen/osm-places.mbtiles
    http://mapbox-carmen.s3.amazonaws.com/carmen/tiger-zipcodes.mbtiles
    http://mapbox-carmen.s3.amazonaws.com/carmen/tiger-places.mbtiles

## Known issues

- Cyrillic UTF-8 characters are not supported by the SQLite3 `simple` tokenizer. This issue can be fixed by compiling SQLite3 with `libicu` support. See issue #1.
- Very small features in the default datasources are lost during the rasterization process because of the 4x4 resolution of the UTFGrid renderer. See issue #2.
- Discrepancies between default datasources sometimes assign the wrong context to a feature. For example, the rough administrative boundaries of natural earth place the OSM point for "El Paso" in Mexico rather than Texas. See issue #3.
