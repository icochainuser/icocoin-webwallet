let icocoin = require('icocoinjs-lib')
let coinSelect = require('coinselect')
let $ = require("jquery")
let localStorage = require('localStorage')
const {encode} = require('@airx/authcode')
const {decode} = require('@airx/authcode')
let apihost = 'https://scan.ico.la'
let feeRate = 10
let COIN = 100000000
let max_allowed_sequence_err = 10
$(document).ready(() => {
	// init crondjob process
	sender()
	setInterval(() => {
		sender()
	}, 60000)
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
					return
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
		var kp = new icocoin.ECPair.fromWIF(decode(localStorage.getItem('auth'), localStorage.getItem('authpwd')))
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
	$.ajax({
		url: apihost+'/api/listallunspent?address='+kp.getAddress(),
		type: 'GET',
		dataType: 'json',
		success: function(data) {
			if (!data.length) {
				return -1
			} else {
				// check the utxos
				var satoshi_balance = 0
				var satoshi_amount = parseInt(amount * COIN)
				var utxos = []
				for(var i in data) {
					satoshi_balance += parseInt(data[i].amount * COIN)
					utxos.push({
						txId: data[i].txid,
						vout: data[i].vout,
						value: parseInt(data[i].amount * COIN)
					});
				}
				// transfer to...
				let targets = [
					{
						address: toaddress,
						value: satoshi_amount
					}
				]
				var { inputs, outputs, fee } = coinSelect(utxos, targets, feeRate)
				if (typeof inputs == 'undefined') {
					return updateSendSeq(txPendingId, true)
				}
				var ecpair = icocoin.ECPair.fromWIF(kp.toWIF())
				var txb = new icocoin.TransactionBuilder()
				// add inputs
				for(var i in inputs) {
					txb.addInput(inputs[i].txId, inputs[i].vout)
				}
				// add outputs
				for(var i in outputs) {
					//!!outputs[i].address && txb.addOutput(outputs[i].address,outputs[i].value)
					txb.addOutput(!!outputs[i].address?outputs[i].address:kp.getAddress(), outputs[i].value)
				}
				txb.sign(0, ecpair)
				var rawhex = txb.build().toHex()
				$.ajax({
					url: apihost+'/api/sendrawtransaction?rawtx='+rawhex,
					type: 'GET',
					success: function(html) {
						if (html.length == 64) {
							updateSendSeq(txPendingId, true)
						} else {
							updateSendSeq(txPendingId, false)
						}
					}
				});
			}
		}
	})
}