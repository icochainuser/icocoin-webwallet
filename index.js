let icocoin = require('icocoinjs-lib')
let coinSelect = require('coinselect')
let string_random = require('string_random.js')
let $ = require("jquery")
let bigi = require('bigi')
let localStorage = require('localStorage')
const {encode} = require('@airx/authcode');
const {decode} = require('@airx/authcode');
let account_apis = ['http://localhost/coinhisdata/index2.php?u=http://47.75.75.193:3001/api/'];
let COIN = 100000000;
let feeRate = 10;
// generate a random ico wallet key
let gen_randicokey = function () {
	return 'ICO'+string_random.String_random(/[a-zA-Z0-9]{42}/)
}
// create a keyPair from a string
let gen_address = function(seed) {
	var hash = icocoin.crypto.sha256(Buffer.from(seed))
	var d = bigi.fromBuffer(hash)
	var keyPair = new icocoin.ECPair(d)
	return keyPair
}
// restore a keyPair from WIF
let restore_keypair = function(wif) {
	return new icocoin.ECPair.fromWIF(wif)
}
// add the send command to sequence
let addSendSeq = function(toaddress, amount) {
	var sequence = []
	if (localStorage.getItem('sendsequence')) {
		sequence = JSON.parse(localStorage.getItem('sendsequence'))
	}
	sequence.push({
		to: toaddress,
		amount: amount
	});
	//localStorage.setItem('sendsequence', '');
	localStorage.setItem('sendsequence', JSON.stringify(sequence));
	console.error(sequence);
}
// send ico
let sendto = function(toaddress, amount) {
	var kp = getkeyPair()
	$.ajax({
		url: 'http://localhost/coinhisdata/index2.php?u=http://chain.ico.la:3001/api/listallunspent?address='+kp.getAddress(),
		type: 'GET',
		dataType: 'json',
		success: function(data) {
			if (!data.length) {
				alert('insufficient balance')
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
					alert('insufficient balance')
					return false
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
					url: account_apis[0]+'sendrawtransaction?rawtx='+rawhex,
					type: 'GET',
					success: function(html) {
						console.log(html)
					}
				});
				console.log('send rawtx '+rawhex)
				return true
			}
		}
	})
}
// decode for wif
let getkeyPair = function() {
	var userpass = '000000'
	if (localStorage.getItem('authtype') == 'wif') {
		// user import from wif
		var keyPair = new icocoin.ECPair.fromWIF(decode(localStorage.getItem('auth'), userpass))
	} else {
		// user import from seed
		var seed = decode(localStorage.getItem('auth'),userpass)
		var keyPair = gen_address(seed + userpass)
	}
	return keyPair
}

// encode(icokey,pass)
$(document).ready(() =>{
	localStorage.setItem('auth', encode('KwcioBaNd3hzASf8FQokJTqL63DWJScKoDQUxtZoLR6SLBJ8EvGS','000000'));
	localStorage.setItem('authtype', 'wif')
	//console.error()
	addSendSeq('i5wicD2f3KYkLDUGk7KRjeT2qGv2KECaFn', (0.010 + Math.random()/10000).toFixed(8))
	setTimeout(function() {
		window.location.reload()
	}, 30000);

/*
	
	//var seed = gen_randicokey()
	var seed = 'ICOG2J0TwultMEHidkWX08vcSobVm1rk68kgI4weWL5iF'
	
	localStorage.setItem('auth', encode(seed,userpass));

	console.error(localStorage.getItem('auth'));
	console.error(decode(localStorage.getItem('auth'),userpass))*/
return
});
