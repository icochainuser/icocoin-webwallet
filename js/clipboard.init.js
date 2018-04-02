window.addEventListener('load', ()=> {
	setTimeout(() => {
		var clipboard = new ClipboardJS(document.querySelector('.acc-copy-address'))
	}, 100)
})