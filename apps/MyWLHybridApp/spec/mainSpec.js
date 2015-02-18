/* global MyWLApp */

describe('Main', function() {
    'use strict';
    it('should define a MyWLApp global object', function() {
        expect(MyWLApp).toBeDefined();
    });
    describe('getUserEmail', function() {
    	it('should call failureCallback when adapter isSuccessful is false', function(done) {
    		var fakeInvokeProcedure = function(invocationData, options) {
    			options.onSuccess({
    				invocationResult: {
    					isSuccessful: false
    		          	}
    		       });
    		};
    		spyOn(WL.Client, "invokeProcedure").and.callFake(fakeInvokeProcedure);

    	    var onSuccess = function() {
    	        expect('onSuccess should not be called').not.toBeDefined();
    	        done();
    	    };
    	    var onFailure = function() {
    	        done();
    	    };
    	    MyWLApp.getUserEmail('joe', onSuccess, onFailure);
    	});
    });
});
