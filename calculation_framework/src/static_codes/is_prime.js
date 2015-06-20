function is_prime(candidate) {
	for (var i = 2; i <= Math.sqrt(candidate); i++) {
		if (candidate % i === 0) {
			return false;
		}
	}
	return true;
}
