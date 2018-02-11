/*

| [ LINE Web Chat - by GoogleX ]
| 
| Special thanks to:
|  - StackoverFlow
|  - Bootstrap snippets
|
| Copyright (c) 2018


*/

console.info("\n\
----         --------  ----    ---- ------------ \n\
****         ********  *****   **** ************ \n\
----           ----    ------  ---- ----         \n\
****           ****    ************ ************ \n\
----           ----    ------------ ------------ \n\
************   ****    ****  ****** ****         \n\
------------ --------  ----   ----- ------------ \n\
************ ********  ****    **** ************ \n\
                                                 ");
console.info("\nNOTE : This project is made by @GoogleX !\n\
***Copyright belongs to the author***\n\n\n\n");

/* Const variable */

const unirest = require('unirest');
const qrcode = require('qrcode-terminal');
const util = require("util");
const mime = require("mime");
const path = require('path');
const rp = require('request-promise');
const request = require('request');
const LineService = require('./thrift/TalkService.js');
const jsonfile = require('jsonfile');
const TTypes = require('./thrift/line_types');
const sqbot = require('./pkg/main');
const PinVerifier = require('./pkg/pinVerifier');


/* GLOBAL Var */

var thrift = require('thrift-http');
var xtes = "getAuthQrcode";
var fs = require('fs');
var config = require('./pkg/config');
var reqx = new TTypes.LoginRequest();
var axy = axz = axc = false;
var TauthService,Tclient,connection,Tcustom = {},xsess,objsess = {},revision,xry,profile = {};
var options = {
    protocol: thrift.TCompactProtocol,
    transport: thrift.TBufferedTransport,
    headers: config.Headers,
    path: config.LINE_HTTP_URL,
    https: true
};

/* Update Check */
console.log('\nChecking update....')
sqbot.checkUpdate();

/* Function */

function setTHttpClient(xoptions = {
    protocol: thrift.TCompactProtocol,
    transport: thrift.TBufferedTransport,
    headers: config.Headers,
    path: config.LINE_HTTP_URL,
    https: true
  },callback,xcustom="none",tpath) {
	xoptions.headers['X-Line-Application'] = 'DESKTOPWIN\t7.18.1\tFDLRCN\t11.2.5';
    connection =
      thrift.createHttpConnection(config.LINE_DOMAIN_3RD, 443, xoptions);
    connection.on('error', (err) => {
      console.log('err',err);
      return err;
    });
	if(axy === true){
		TauthService = thrift.createHttpClient(require('./thrift/AuthService.js'), connection);axy = false;
		if(sqbot.isFunction(callback)){
			callback("DONE");
		}
	} else if (axc === true){
		eval(`Tcustom.${xcustom} = thrift.createHttpClient(require('./thrift/${tpath}.js'), connection);`);axc = false;
		if(sqbot.isFunction(callback)){
			callback("DONE");
		}
	} else {
		Tclient = thrift.createHttpClient(LineService, connection);
		if(sqbot.isFunction(callback)){
			callback("DONE");
		}
	}
    
}

function authConn(callback){
	axy = true;
	options.path = config.LINE_RS;
    setTHttpClient(options,(xres) => {
		if(xres == "DONE"){
			callback("DONE");
		}
	});
}

function serviceConn(path,xcustom,tpath,callback){
	axc = true;
	options.path = path;
    setTHttpClient(options,(xres) => {
		if(xres == "DONE"){
			callback("DONE");
		}
	},xcustom,tpath);
}

function getQrLink(callback) {
	options.path = config.LINE_HTTP_URL;
    setTHttpClient(options,(xres) => {
		if(xres == "DONE"){
   			 Tclient.getAuthQrcode(true, "SQBOT",(err, result) => {
    		  // console.log('here')
			  //console.log(err)
     		 const qrcodeUrl = `line://au/q/${result.verifier}`;
			callback(qrcodeUrl,result.verifier);
    		});
		}
	});
}

function qrLogin(xverifier,callback){
	Object.assign(config.Headers,{ 'X-Line-Access': xverifier });
        unirest.get('https://gd2.line.naver.jp/Q')
          .headers(config.Headers)
          .timeout(120000)
          .end(async (res) => {
            const verifiedQr = res.body.result.verifier;
			authConn((xret) => {
			if(xret == "DONE"){
			reqx.type = 1;
			reqx.verifier = verifiedQr;
			reqx.systemName = "SQBOT";
			reqx.identityProvider = 1;
			reqx.e2eeVersion = 0;
			TauthService.loginZ(reqx,(err,success) => {
				//console.info("err=>"+err);
					//console.info(JSON.stringify(success));
				config.tokenn = success.authToken;
				config.certificate = success.certificate;
				let xdata = {
					authToken: success.authToken,
					certificate: success.certificate
				}
				callback(xdata);
			});}
			});
          });
}

function credLogin(id,password,callback){
	  const pinVerifier = new PinVerifier(id, password);
	  let provider = 1;
	  setTHttpClient(options);
	  sqbot.getRSAKeyInfo(provider, Tclient, (key, credentials) => {
		  authConn(()=>{
		  const rsaCrypto = pinVerifier.getRSACrypto(credentials);
		  reqx.type = 0;
	      reqx.identityProvider = provider;
		  reqx.identifier = rsaCrypto.keyname;
		  reqx.password = rsaCrypto.credentials;
		  reqx.keepLoggedIn = true;
		  reqx.accessLocation = config.ip;
		  reqx.systemName = 'SquareBot';
		  reqx.e2eeVersion = 0;
			  try{
			      TauthService.loginZ(reqx,(err,success) => {
				      if (err) {
                          console.log('\n\n');
                          console.error("=> "+err.reason);
                          process.exit();
                      }
				      options.path = config.LINE_COMMAND_PATH;
                      setTHttpClient(options);
				      authConn(()=>{
						  let pinCode = success.pinCode;
                	      console.info("\n\n=============================\nEnter This Pincode => "+success.pinCode+"\nto your mobile phone in 2 minutes\n=============================");
                	      sqbot.checkLoginResultType(success.type, success);
						  reqx = new TTypes.LoginRequest();
						  reqx.type = 1;
						  reqx = new TTypes.LoginRequest();
		                  unirest.get('https://'+config.LINE_DOMAIN+config.LINE_CERTIFICATE_URL)
						   .headers(config.Headers)
						   .timeout(120000)
                           .end(async (res) => {
			                 reqx.type = 1;
			                 reqx.verifier = res.body.result.verifier;
	                         TauthService.loginZ(reqx,(err,success) => {
						       options.path = config.LINE_COMMAND_PATH;
                               setTHttpClient(options);
							   //config.tokenn = success.authToken;
               		           sqbot.checkLoginResultType(success.type, success);
               		           callback(success);
	                         })
                           })
					 });
			      });
			  }catch(error) {
                  console.log('error');
                  console.log(error);
              }
		  })
	  })
}

function lineLogin(type=1, callback){
	/*
	Login Type
	0 = CREDENTIAL
	1 = QR
	*/
	
	//INSERT YOUR CREDENTIAL HERE (IF YOU ARE USING type=0)
	let email = ''; 
	let password = '';
	
	switch(type){
		case 0:
		    credLogin(email,password,(res)=>{
				callback(res);
			});
		break;
		case 1:
		    getQrLink((qrcodeUrl, verifier)=>{
		        console.info('> Please login to your LINE account');
		        console.info('> Your qrLink: '+qrcodeUrl);
		        qrcode.generate(qrcodeUrl, {small: true});
		        qrLogin(verifier,(res)=>{
			        console.info('> Login Success');
					callback(res);
		        })
	        })
		break;
		default:
		    console.info('> Login type invalid');
			callback('FAIL');
	}
}

function botKeyword(ops){
	sqbot.getSquareMessage(ops,(res)=>{
		if(res.msg && res.msg !== 'undefined'){
		    let message = res.msg;
		    if(res.txt == 'help'){
		    	sqbot.squareSendMessage(Tcustom.square,message,'Im ready !');
		    }
	    }
	})
}

sqbot.restoreSquareRev((res)=>{
	if(res != 'error'){
		config.sync = res.syncToken;
	    config.conToken = res.continuationToken;
	}
});

//CHANGE YOUR LOGIN TYPE HERE
lineLogin(0,(res)=>{
	options.headers['X-Line-Access'] = res.authToken;
	serviceConn('/SQS1','square','SquareService',(res)=>{
	    console.info('> Success connected to square service');
	    setInterval(() => {
			if(config.sync == '' || config.conToken == ''){
	            sqbot.squarePoll((err,success)=>{
				    if(err) throw err;
				    config.sync = success.syncToken;
	                config.conToken = success.continuationToken;
					botKeyword(success);
					sqbot.saveSquareRev(config.sync,config.conToken);
			    },Tcustom.square);
			}else{
				sqbot.squarePoll((err,success)=>{
				    if(err) throw err;
				    config.sync = success.syncToken;
	                config.conToken = success.continuationToken;
					botKeyword(success);
					sqbot.saveSquareRev(config.sync,config.conToken);
			    },Tcustom.square,config.conToken,config.sync);
			}
        }, 2000);
    })
});