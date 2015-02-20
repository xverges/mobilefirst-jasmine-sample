/* global getUserEmail */

describe('getUserMail', function() {
    "use strict";
    it('should return an object with a reply property', function() {
        var actual = getUserEmail('peter');
        expect(actual.email).toBeDefined();
    });
});
