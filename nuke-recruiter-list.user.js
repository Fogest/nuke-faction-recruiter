// ==UserScript==
// @name         Nuklear Applicant
// @namespace    com.jhvisser.nuke
// @version      1.0.1
// @description  To flag those who have had recruitment messages sent
// @author       Altered By Fogest, Originally by Jox [1714547]
// @match        https://www.torn.com/profiles.php*
// @match        https://www.torn.com/hospitalview.php*
// @match        https://www.torn.com/factions.php*
// @match        https://www.torn.com/page.php*
// @grant        GM_xmlhttpRequest
// @connect      nuke.jhvisser.com
// @connect      nukefamily.org
// @connect      torn-faction-companies
// ==/UserScript==

(function() {
    'use strict';

    var apiUrl = 'http://torn-faction-companies/api';

    var uid = null;
    var fid = null;
    var data = null;
    var savedData = null;
    var blackList = null;
    var TargetID = null;
    var TargetPlayerName = null;
    var PlayerName = null;
    var factionName = null;
    var update = 1;

    var blPrfileColor = '#00a1ff3b';
    var blFactionColor = 'rgba(150,70,120,0.5)';
    var wlFactionColor = 'rgba(0,100,0,0.3)';

    console.log('hi there');

    start();


    function start(){
        try{
            savedData = JSON.parse(localStorage.localRecruitlist || '{"blackList" : {}, "timestamp" : 0}');
            blackList = savedData;
            console.log(savedData);
        }
        catch(error){
            console.error(error);
            alert('error loading saved data, please reload page!');
        }

        try{
            uid = getCookie('uid');
            data = JSON.parse(sessionStorage.getItem('sidebarData' + uid));
            if(data && data.user){
                PlayerName = `${data.user.name} [${uid}]`;
            }
        }
        catch(error){
            console.error(error);
        }

        if(Date.now() - savedData.timestamp > update * 60 * 1000){ //minutes * seconds * miliseconds
            console.log('Update blacklist...');
            updateBlackList();
        }

        if(window.location.href.startsWith('https://www.torn.com/hospitalview.php')){
            watchForPlayerListUpdates();
        }

        if(window.location.href.startsWith('https://www.torn.com/factions.php')){
            applyFilterFaction();
        }

        if(window.location.href.startsWith('https://www.torn.com/profiles.php')){
            setTimeout(checkIsPlayerBlaklisted, 500);
        }
    }

    function updateBlackList(){
        GM_xmlhttpRequest ( {
            method:     'GET',
            url:        apiUrl + '/recruits',
            headers:    {},
            onload:     function (response) {
                // DO ALL RESPONSE PROCESSING HERE...
                //console.log('GET Respnse', responseDetails.responseText);
                //alert(responseDetails.responseText);
                //updateBlackList();

                try{
                    var list = JSON.parse(response.responseText).data;

                    var dataToSave = {};
                    list.forEach(function (recruit, index) {
                        var recruitObj = {};
                        recruitObj.faction_id = recruit.faction_id
                        recruitObj.recruited_by_id = recruit.recruited_by_id
                        recruitObj.player_name = recruit.player_name
                        recruitObj.faction_name = recruit.faction_name
                        recruitObj.recruited_by = recruit.recruited_by
                        recruitObj.updated_at = recruit.updated_at

                        dataToSave[recruit.player_id] = recruitObj;
                    });
                    localStorage.localRecruitlist = JSON.stringify(dataToSave);
                    console.log('Recruit list updated');
                    blackList = dataToSave;

                    checkIsPlayerBlaklisted();
                }
                catch(error){
                    console.log(error);
                }
            }
        });
    }

    function checkIsPlayerBlaklisted(){

        var emptyBox = document.querySelector('.user-information .cont');

        if(!emptyBox){
            setTimeout(checkIsPlayerBlaklisted, 500);
        }
        else{

            var player = document.querySelector('.basic-information .basic-list .user-information-section+div>span').innerHTML;
            var id = player.replace(/(.+\[)(\d+)(\])/gm, '$2');
            console.log('checkink is player recruited', id);

            let facLink = document.querySelector(".basic-information .basic-list .user-information-section+div span a[href^='/factions.php']")
            fid = facLink ? facLink.href.replace('https://www.torn.com/factions.php?step=profile&ID=', '') : false;
            factionName = facLink ? facLink.text : false;

            if (id) {
                TargetID = id;
            };

            if (player) {
                TargetPlayerName = player;
            }
            //border-top-style: ridge;
            //border-top-width: thin;
            //padding-top: 4px;
            //padding-bottom: 3px;

            var div = document.createElement('div');
            div.classList.add('empty-box');
            div.id = "recruit-list-box";

            div.style.borderTop = 'thin ridge #cecece';
            div.style.paddingTop = '4px';
            div.style.paddingBottom = '3px';

            var userInformationContainer = document.querySelector('.user-information .cont');

            if(blackList[id]){
                var ul = document.createElement('ul');
                ul.style.padding = '3px 10px';
                ul.style.margin = '0 5px';

                if(blackList[id]){
                    userInformationContainer.style.backgroundColor = blPrfileColor;

                    let li = document.createElement('li');
                    li.innerHTML = 'Recruited by: <span class="bold">' + blackList[id].recruited_by + ': </span> at ' + blackList[id].updated_at;

                    ul.appendChild(li);
                }

                emptyBox.style.overflow = 'auto';
                div.appendChild(ul)
                emptyBox.appendChild(div);
            }
            else{
                var a = document.createElement('a');
                a.href="#";
                a.innerHTML = "Add to Nuke's Recruit List";
                a.style.margin = '1px 15px 0px';
                //a.style.display = 'block';
                a.onclick = reportToNuke;

                div.appendChild(a);

                //var r = document.createElement('a');
                //r.href="#";
                //r.innerHTML = "Remove";
                //r.style.margin = '1px 15px 0px';
                //r.style.display = 'block';
                //r.style.float = 'right';

                //div.appendChild(r);
            }
            emptyBox.appendChild(div);
        }
    }

    function reportToNuke(){

        if(!PlayerName){
            uid = getCookie('uid');
            data = JSON.parse(sessionStorage.getItem('sidebarData' + uid));
            if(data && data.user){
                PlayerName = `${data.user.name} [${uid}]`;
            }
        }

        const regex = /^(.*?)\s\[/;
        PlayerName = regex.exec(PlayerName)[1];
        TargetPlayerName = regex.exec(TargetPlayerName)[1];

        if(PlayerName){
            var postData = 'player_id=' + TargetID;
            postData += '&recruited_by_id=' + getCookie('uid');
            postData += '&player_name=' + TargetPlayerName;
            postData += '&recruited_by=' + PlayerName;

            if (fid && factionName) {
                postData += '&faction_name=' + factionName;
                postData += '&faction_id=' + fid;
            }

            GM_xmlhttpRequest ( {
                method:     'POST',
                url:        apiUrl + '/recruits',
                headers:    {"Content-Type": "application/x-www-form-urlencoded"},
                data:       postData,
                onload:     function (response) {
                    alert(response.responseText);
                    updateBlackList();
                }
            });
        }
        else{
            alert('Same player data missing, refresh page and try again');
        }
    }

    function applyFilter(){
        let list = document.querySelector('.users-list');
        for(var i=0; i < list.childNodes.length; i++){
            if(list.childNodes[i].childNodes.length > 0){
                //console.log(list.childNodes[i]);
                var id = list.childNodes[i].querySelector('a.user.name').href.replace('https://www.torn.com/profiles.php?XID=', '');
                var fid = list.childNodes[i].querySelector('a.user.faction').href.replace('https://www.torn.com/factions.php?step=profile&ID=', '');

                console.log(id, fid);

                if(blackList[id]){
                    list.childNodes[i].style.backgroundColor = blPrfileColor;
                    list.childNodes[i].classList.add('nuke-blacklist');
                }
            }
        }
    }

    function applyFilterFaction(){
        let list = document.querySelector('.member-list');
        for(var i=0; i < list.childNodes.length; i++){
            if(list.childNodes[i].childNodes.length > 0){
                //console.log(list.childNodes[i]);
                var id = list.childNodes[i].querySelector('a.user.name').href.replace('https://www.torn.com/profiles.php?XID=', '');
                var fid = list.childNodes[i].querySelector('a.user.faction').href.replace('https://www.torn.com/factions.php?step=profile&ID=', '');

                if(blackList[id]){
                    list.childNodes[i].style.backgroundColor = blPrfileColor;
                    list.childNodes[i].classList.add('nuke-blacklist');
                }

            }
        }
    }


    function isListOfPlayers(node) {
        //console.log('Node',node);

        if(node.childNodes.length >= 5){
        return node.childNodes[5].classList !== undefined &&
            node.childNodes[5].classList.contains('user') &&
            node.childNodes[5].classList.contains('name');
        }
        else{
            return false;
        }
    }

    function watchForPlayerListUpdates() {
        let target = document.querySelector('.userlist-wrapper');
        let doApplyFilter = false;
        let observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                let doApplyFilter = false;
                for (let i = 0; i < mutation.addedNodes.length; i++) {
                    //console.log(mutation.addedNodes.item(i));
                    if (isListOfPlayers(mutation.addedNodes.item(i))) {
                        doApplyFilter = true;
                        //console.log('Have List of players');
                        break;
                    }
                    else{
                        //console.log('Not a List of players');
                        if(mutation.target && mutation.target.nodeType == 1 && mutation.target.classList.contains('confirm-revive')){
                            break;
                        }
                    }
                }

                if (doApplyFilter) {
                    applyFilter();
                }
            });
        });
        // configuration of the observer:
        //let config = { childList: true, subtree: true };
        let config = { childList: true, subtree: true };
        // pass in the target node, as well as the observer options
        observer.observe(target, config);
    }

    function getCookie (name) {
        var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return match[2];
    }

})();
