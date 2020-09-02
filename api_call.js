const fs = require('fs')                                                          
const fetch = require('node-fetch')
var code = ""
fs.readFile('../jsfile.txt', (err, data) => {                                     
	    if (err) throw err;
	    code = data.toString()                                                        
})  






t = require('request');

request.post(
	    'http://www.yoursite.com/formpage',
	    { json: { key: 'value' } },
	    function (error, response, body) {
		            if (!error && response.statusCode == 200) {
				                console.log(body);
				            }
		        }
);
