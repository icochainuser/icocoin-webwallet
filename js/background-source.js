var ethers = require('ethers')
let $ = require("jquery")
let localStorage = require('localStorage')
const {encode} = require('@airx/authcode')
const {decode} = require('@airx/authcode')
let max_allowed_sequence_err = 20
var provider = new ethers.providers.JsonRpcProvider('http://107.181.154.209:9646', { name: 'mainnet', chainId: 256 })
$(document).ready(() => {
	// init crondjob process
	sender()
	setInterval(() => {
		sender()
	}, 3000)
})
// send process
var sender = function() {
	if (localStorage.getItem('sendsequence')) {
		try {
			var sequence = JSON.parse(localStorage.getItem('sendsequence'))
			if (sequence.length > 0) {
				// if reached max allowed err times
				if (sequence[0].err > max_allowed_sequence_err) {
					sequence.splice(0 ,1)
					localStorage.setItem('sendsequence', JSON.stringify(sequence))
					return;
				} else {
					// sign and try to broadcast
					sendto(sequence[0].to,sequence[0].amount,sequence[0].id)
				}
			}
		} catch(err) {
			console.error(err)
		}
	}
}
let getKeyPair = function() {
	try {
		var kp = new ethers.Wallet(decode(localStorage.getItem('auth'), localStorage.getItem('authpwd')));
		kp.provider = provider;
		return kp
	} catch(err) {
	}
}
// delete or update send sequence items
let updateSendSeq = function(txPendingId, isdelete) {
	if (txPendingId == '' || typeof(txPendingId) == 'undefined') return
	var sequence = []
	if (localStorage.getItem('sendsequence')) {
		sequence = JSON.parse(localStorage.getItem('sendsequence'))
	}
	for (var i in sequence) {
		if (sequence[i].id == txPendingId) {
			if (isdelete) {
				sequence.splice(i, 1)
				localStorage.setItem('sendsequence', JSON.stringify(sequence))
				return 1
			} else {
				sequence[i].err++
				localStorage.setItem('sendsequence', JSON.stringify(sequence))
				return 1
			}
		}
	}
}
let sendto = function(toaddress, amount, txPendingId) {
	var kp = getKeyPair()
	var amount = ethers.utils.parseEther(amount);
	try {
		var sendPromise = kp.send(toaddress, amount);
		sendPromise.then(function(transactionHash) {
			updateSendSeq(txPendingId, true)
		});
	} catch(err) {
		console.error('occ');
		console.error(err);
		updateSendSeq(txPendingId, false);
	}
}