var _ = require('underscore');
var fs = require('fs');
var assert = require('assert');
var util = require('util');
var Carmen = require('..');
var S3 = Carmen.S3();

describe('api s3', function() {

var expected = {
    bounds: '-141.005548666451,41.6690855919108,-52.615930948992,83.1161164353916',
    lat: 56.8354595949484,
    lon: -110.424643384994,
    name: 'Canada',
    population: 33487208,
    search: 'Canada, CA'
};

var from = new S3({data:{
    "_geocoder": "http://mapbox-carmen.s3.amazonaws.com/dev/01-ne.country",
    "maxzoom": 8
}}, function() {});

var prefixed = new S3({data:{
    "_geocoder": "http://mapbox-carmen.s3.amazonaws.com/dev/01-ne.country.prefixed/{prefix}",
    "maxzoom": 8
}}, function() {});

it('getFeature', function(done) {
    from.getFeature(16, function(err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, expected);
        done();
    });
});

it('getFeature (prefixed source)', function(done) {
    prefixed.getFeature(16, function(err, doc) {
        assert.ifError(err);
        assert.deepEqual(doc, expected);
        done();
    });
});

it.skip('putFeature', function(done) {
    to.startWriting(function(err) {
        assert.ifError(err);
        to.putFeature(16, expected, function(err) {
            assert.ifError(err);
            to.stopWriting(function(err) {
                assert.ifError(err);
                to.getFeature(16, function(err, doc) {
                    assert.ifError(err);
                    assert.deepEqual(doc, expected);
                    done();
                });
            });
        });
    });
});

it('getGeocoderData', function(done) {
    from.getGeocoderData('term', 0, function(err, buffer) {
        assert.ifError(err);
        assert.equal(4137, buffer.length);
        done();
    });
});

it('getGeocoderData (prefixed source)', function(done) {
    prefixed.getGeocoderData('term', 0, function(err, buffer) {
        assert.ifError(err);
        assert.equal(4137, buffer.length);
        done();
    });
});

it.skip('putGeocoderData', function(done) {
    to.startWriting(function(err) {
        assert.ifError(err);
        to.putGeocoderData('term', 0, new Buffer('asdf'), function(err) {
            assert.ifError(err);
            to.stopWriting(function(err) {
                assert.ifError(err);
                to.getGeocoderData('term', 0, function(err, buffer) {
                    assert.ifError(err);
                    assert.deepEqual('asdf', buffer.toString());
                    done();
                });
            });
        });
    });
});

it('getIndexableDocs', function(done) {
    from.getIndexableDocs({ limit: 10 }, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 10);
        assert.deepEqual(pointer, {limit:10, done:false, marker:'dev/01-ne.country/data/107.json' });
        from.getIndexableDocs(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(docs.length, 10);
            assert.deepEqual(pointer, { limit: 10, done:false, marker:'dev/01-ne.country/data/116.json' });
            done();
        });
    });
});

it('getIndexableDocs (prefixed source)', function(done) {
    prefixed.getIndexableDocs({ limit: 10 }, function(err, docs, pointer) {
        assert.ifError(err);
        assert.equal(docs.length, 0);
        assert.deepEqual(pointer, {limit:10, done:false, marker:null, prefix:1 });
        prefixed.getIndexableDocs(pointer, function(err, docs, pointer) {
            assert.ifError(err);
            assert.equal(1, docs.length);
            assert.equal('1', docs[0].id);
            assert.deepEqual(pointer, { limit: 10, done:false, marker:null, prefix:2 });
            prefixed.getIndexableDocs(pointer, function(err, docs, pointer) {
                assert.ifError(err);
                assert.equal(1, docs.length);
                assert.equal('2', docs[0].id);
                assert.deepEqual(pointer, { limit: 10, done:false, marker:null, prefix:3 });
                done();
            });
        });
    });
});

});

