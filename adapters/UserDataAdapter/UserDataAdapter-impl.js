function getUserEmail(username) {
	var reply = 'UNKNOWN';
	if (username === 'bob') {
		reply = 'bob@example.com';
	}
	
	return {email: reply};
}

