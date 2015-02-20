var fixturesPath = (function() {
    "use strict";
    function folder(fp) {
        return fp.substring(0, fp.lastIndexOf('/') + 1);
    }
    var scripts = document.getElementsByTagName('script');
    var specsDir = folder(scripts[scripts.length-1].src);
    var base = folder(document.location.href);
    return specsDir.replace(base, '') + 'fixtures';

})();



describe('html', function() {
    "use strict";
    jasmine.getFixtures().fixturesPath = fixturesPath;

    it('should load fixtures and assert their contents', function() {
        jasmine.getFixtures().load('sample.html');
        expect($('#sample')[0]).toBeInDOM();
        expect($('#sample')[0]).toContainText('ample text');
    });

    it('should remove fixtures', function() {
        expect($('<div id="some-id"></div>')).toEqual('div');
        expect($('#sample')[0]).not.toExist();
    });
});







