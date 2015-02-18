/* exported getUserEmail */
function getUserEmail(username) {
	"use strict";
	var reply = 'UNKNOWN';
	if (username === 'bob') {
		reply = 'bob@example.com';
	}
	
	return {email: reply};
}

