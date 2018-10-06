/*

| [ LINE SquareBot - by GoogleX ]
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

/*Change This*/
var LOGINType = 1; // 0 = CREDENTIAL, 1 = QRCODE, 2 = AuthToken #CHANGE YOUR LOGIN TYPE HERE
var sqChatMid = ''; //INSERT YOUR SQUARECHATMID HERE

/* Const variable */

const unirest = require('unirest');
const qrcode = require('qrcode-terminal');
const util = require("util");
const mime = require("mime");
const path = require('path');
const rp = require('request-promise');
const request = require('request');
const LineService = require('../thrift/TalkService.js');
const jsonfile = require('jsonfile');
const TTypes = require('../thrift/line_types');
const PinVerifier = require('../pkg/pinVerifier');
const BotLib = require('../pkg/BotLib');

/* GLOBAL Var */

var thrift = require('thrift-http');
var xtes = "getAuthQrcode";
var fs = require('fs');
var config = require('../pkg/config');
var reqx = new TTypes.LoginRequest();
var axy = axz = axc = false;
var TauthService, Tclient, connection, Tcustom = {},
    xsess, objsess = {},
    revision, xry, profile = {};
var options = {
    protocol: thrift.TCompactProtocol,
    transport: thrift.TBufferedTransport,
    headers: config.Headers,
    path: config.LINE_HTTP_URL,
    https: true
};
var botlib = new BotLib('', config);

/* Update Check */
console.log('\nChecking update....')
botlib.checkUpdate();

/* Function */

function setTHttpClient(xoptions = {
    protocol: thrift.TCompactProtocol,
    transport: thrift.TBufferedTransport,
    headers: config.Headers,
    path: config.LINE_HTTP_URL,
    https: true
}, callback, xcustom = "none", tpath) {
    xoptions.headers['X-Line-Application'] = 'DESKTOPWIN\t7.18.1\tFDLRCN\t11.2.5';
    connection =
        thrift.createHttpConnection(config.LINE_DOMAIN_3RD, 443, xoptions);
    connection.on('error', (err) => {
        console.log('err', err);
        return err;
    });
    if (axy === true) {
        TauthService = thrift.createHttpClient(require('../thrift/AuthService.js'), connection);
        axy = false;
        if (botlib.isFunction(callback)) {
            callback("DONE");
        }
    } else if (axc === true) {
        eval(`Tcustom.${xcustom} = thrift.createHttpClient(require('../thrift/${tpath}.js'), connection);`);
        axc = false;
        if (botlib.isFunction(callback)) {
            callback("DONE");
        }
    } else {
        Tclient = thrift.createHttpClient(LineService, connection);
        if (botlib.isFunction(callback)) {
            callback("DONE");
        }
    }

}

function authConn(callback) {
    axy = true;
    options.path = config.LINE_RS;
    setTHttpClient(options, (xres) => {
        if (xres == "DONE") {
            callback("DONE");
        }
    });
}

function serviceConn(path, xcustom, tpath, callback) {
    return new Promise((resolve,reject)=>{
        axc = true;
        options.path = path;
        setTHttpClient(options, (xres) => {
            if (xres == "DONE") {
                resolve("DONE");
            }
        }, xcustom, tpath);
    })
}

function getQrLink(callback) {
    options.path = config.LINE_HTTP_URL;
    setTHttpClient(options, (xres) => {
        if (xres == "DONE") {
            Tclient.getAuthQrcode(true, "SQBOT", (err, result) => {
                // console.log('here')
                //console.log(err)
                const qrcodeUrl = `line://au/q/${result.verifier}`;
                callback(qrcodeUrl, result.verifier);
            });
        }
    });
}

function qrLogin(xverifier, callback) {
    Object.assign(config.Headers, {
        'X-Line-Access': xverifier
    });
    unirest.get('https://gd2.line.naver.jp/Q')
        .headers(config.Headers)
        .timeout(120000)
        .end(async (res) => {
            const verifiedQr = res.body.result.verifier;
            authConn((xret) => {
                if (xret == "DONE") {
                    reqx.type = 1;
                    reqx.verifier = verifiedQr;
                    reqx.systemName = "SQBOT";
                    reqx.identityProvider = 1;
                    reqx.e2eeVersion = 0;
                    TauthService.loginZ(reqx, (err, success) => {
                        //console.info("err=>"+err);
                        //console.info(JSON.stringify(success));
                        config.tokenn = success.authToken;
                        config.certificate = success.certificate;
                        let xdata = {
                            authToken: success.authToken,
                            certificate: success.certificate
                        }
                        callback(xdata);
                    });
                }
            });
        });
}

function credLogin(id, password, callback) {
    const pinVerifier = new PinVerifier(id, password);
    let provider = 1;
    setTHttpClient(options);
    botlib = new BotLib(Tclient, config)
    botlib.getRSAKeyInfo(provider, Tclient, (key, credentials) => {
        authConn(() => {
            const rsaCrypto = pinVerifier.getRSACrypto(credentials);
            reqx.type = 0;
            reqx.identityProvider = provider;
            reqx.identifier = rsaCrypto.keyname;
            reqx.password = rsaCrypto.credentials;
            reqx.keepLoggedIn = true;
            reqx.accessLocation = config.ip;
            reqx.systemName = 'SquareBot';
            reqx.e2eeVersion = 0;
            try {
                TauthService.loginZ(reqx, (err, success) => {
                    if (err) {
                        console.log('\n\n');
                        console.error("=> " + err.reason);
                        process.exit();
                    }
                    options.path = config.LINE_COMMAND_PATH;
                    setTHttpClient(options);
                    authConn(() => {
                        let pinCode = success.pinCode;
                        console.info("\n\n=============================\nEnter This Pincode => " + success.pinCode + "\nto your mobile phone in 2 minutes\n=============================");
                        botlib.checkLoginResultType(success.type, success);
                        reqx = new TTypes.LoginRequest();
                        reqx.type = 1;
                        reqx = new TTypes.LoginRequest();
                        unirest.get('https://' + config.LINE_DOMAIN + config.LINE_CERTIFICATE_URL)
                            .headers(config.Headers)
                            .timeout(120000)
                            .end(async (res) => {
                                reqx.type = 1;
                                reqx.verifier = res.body.result.verifier;
                                TauthService.loginZ(reqx, (err, success) => {
                                    options.path = config.LINE_POLL_URL;
                                    setTHttpClient(options);
                                    config.tokenn = success.authToken;
                                    console.info('> AuthToken: ' + res.authToken);
                                    botlib.checkLoginResultType(success.type, success);
                                    callback(success);
                                })
                            })
                    });
                });
            } catch (error) {
                console.log('error');
                console.log(error);
            }
        })
    })
}

function lineLogin(type = 1, callback) {
    /*
    Login Type
    0 = CREDENTIAL
    1 = QR
    2 = Token
    */

    //INSERT YOUR CREDENTIAL HERE (IF YOU ARE USING type=0)
    let email = '';
    let password = '';

    //INSERT YOUR AUTHTOKEN HERE(IF YOU ARE USING type=2)
    let authToken = '';

    switch (type) {
        case 0:
            credLogin(email, password, (res) => {
                callback(res);
            });
            break;
        case 1:
            getQrLink((qrcodeUrl, verifier) => {
                console.info('> Please login to your LINE account');
                console.info('> Your qrLink: ' + qrcodeUrl);
                qrcode.generate(qrcodeUrl, {
                    small: true
                });
                qrLogin(verifier, (res) => {
                    console.info('> AuthToken: ' + res.authToken);
                    console.info('> Login Success');
                    options.path = config.LINE_POLL_URL;
                    setTHttpClient(options);
                    callback(res);
                })
            })
            break;
        case 2:
            config.tokenn = authToken;
            options.headers['X-Line-Access'] = authToken;
            options.path = config.LINE_POLL_URL;
            setTHttpClient(options);
            let xdata = {
                authToken: authToken
            }
            callback(xdata);
            break;
        default:
            callback('FAIL');
    }
}

/* Edit your keyword here */

function botKeyword(ops) {
    let res = botlib.getSquareMessage(ops);
    if (res.msg && res.msg !== 'undefined') {
        let message = res.msg;
        if (res.txt == 'help') {
            botlib.squareSimpleSendMessage(message, '~~~~Keyword\n\n\
- creator\n\
- help\n\
- myid\n\
- speed\n\
- time');
        }

        if (res.txt == 'myid') {
            await botlib.squareSimpleSendMessage(message, 'Your ID: ' + message._from);
        }

        if (res.txt == 'speed') {
            const curTime = (Date.now() / 1000);
            await botlib.squareSimpleSendMessage(message, 'Please wait...');
            const rtime = (Date.now() / 1000);
            const xtime = rtime - curTime;
            await botlib.squareSimpleSendMessage(message, xtime + ' seconds');
        }

        if (res.txt == 'creator') {
            await botlib.squareSendContact(message.to, 'u5ee3f8b1c2783990512a02c14d312c89');
        }

        if (res.txt == 'time') {
            let d = new Date();
            let xmenit = d.getMinutes().toString().split("");
            if (xmenit.length < 2) {
                await botlib.squareSimpleSendMessage(message, d.getHours() + ":0" + d.getMinutes());
            } else {
                await botlib.squareSimpleSendMessage(message, d.getHours() + ":" + d.getMinutes());
            }
        }

    }
}

/*---------------------------------------------------------------------------*/

botlib.restoreSquareRev((res) => {
    if (res != 'error') {
        config.sync = res.syncToken;
        config.conToken = res.continuationToken;
    }
}, sqChatMid);

lineLogin(LOGINType, async(res) => {
    if (res == 'FAIL') {
        console.info('> Login type invalid');
        return;
    }
    options.headers['X-Line-Access'] = res.authToken;
    let res = await serviceConn('/SQS1', 'square', 'SquareService');
    botlib = new BotLib(Tcustom.square, config);
    console.info('> Success connected to square service');
    while(true){
        if (config.sync == '' || config.conToken == '') {
            let success = botlib.squareSingleChatPoll('', sqChatMid, 0, '', '', 1, 1);
            //console.info(err)
            if(success[0]) throw err;
            //console.info(success.events[0].payload)
            botKeyword(success[1]);
            config.sync = success[1].syncToken;
            config.conToken = success[1].continuationToken;
            botlib.saveSquareRev(sqChatMid, config.sync, config.conToken);
        } else {
            let success = botlib.squareSingleChatPoll('', sqChatMid, 0, config.sync, config.conToken, 1, 1);
            //console.info(err)
            if (success[0]) throw err;
            //console.info(success.events[0].payload)
            botKeyword(success[1]);
            config.sync = success[1].syncToken;
            config.conToken = success[1].continuationToken;
            botlib.saveSquareRev(sqChatMid, config.sync, config.conToken);
        }
    }
});

process.on('uncaughtException', function(err) {
    console.info("Something make me cry \n" + err);

});
