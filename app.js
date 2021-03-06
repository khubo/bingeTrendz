function makeLambdaCall(){
    var loaderDOM = document.getElementById('load_spinner');
    loaderDOM.style.display = "block";
    var cachedData = getCachedData();
    var isCacheValid = new Date().getTime() - cachedData.refetchTime < 0;
    if(!!cachedData.result && isCacheValid){
        showData(cachedData.result);
        return;
    }
    lambda.call(
        function(data){
            showData(data);
            setDataToLocalStore(data.results);
        },
        function(e){
            if(cachedData && !!cachedData.result){
                showData(cachedData.result);
                ShowNotification({type:'warning',message:'Failed to fetch latest results. Showing older reults.'});
                return;
            }
            ShowNotification({type:'error',message:'Something went wrong. Please try again later.'});
        }
    );
}

function setDateTime(){
    var dateCardDOM = document.getElementById('date-card__date'),
        timeCardDOM = document.getElementById('date-card__time'),
        dateObj = new Date();
    var date = dateObj.getDate(),
        month = dateObj.getMonth(),
        year = dateObj.getFullYear(),
        formattedDtString = formatDateString(date,month,year);
    var hour = dateObj.getHours(),
        minute = dateObj.getMinutes(),
        formattedTmString = formatTimeString(hour,minute);
    dateCardDOM.innerText = formattedDtString;
    timeCardDOM.innerText = formattedTmString;     
}
function formatDateString(date,month,year){
    var formattedResult = "";
    var monthShortNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    var yearElements = void 0;
    var shortYear = void 0;
    date = ""+date;
    if(date.length === 1) date = "0"+date;
    month = monthShortNames[month];
    yearElements = (""+year).split('');
    shortYear = yearElements[2]+yearElements[3];
    formattedResult = date + " " + month + " "+ shortYear;
    return formattedResult;
}
function formatTimeString(hour,minute){
    var tailStr = "AM";
    if(hour > 12){
        tailStr = "PM";
        hour -= 12;
    }else if(hour === 0){
        hour = 12;
        tailStr = "AM";
    }
    hour = ""+hour;
    minute = ""+minute;
    if(minute.length === 1) minute = "0"+minute;
    return hour + ":" + minute + " " + tailStr;
}

function setBackdropImg(imgList){
    var backdropDOM = document.getElementById('base__cover'),
        loaderDOM = document.getElementById('load_spinner'),
        backdropImg = selectImage(imgList);
        fullImgURI = "url('"+lambda.images_uri+'/w500/'+backdropImg;+"')";
    backdropDOM.style.backgroundImage = fullImgURI;
    loaderDOM.style.display = "none";
}

function selectImage(imageList){
    if(imageList.length){
        var index = Math.floor(Math.random() * (imageList.length));
        return imageList[index]; 
    }
    return "";
}

function showData(data){
    var resultList = !!data.results ? data.results : data;
    var imgList = resultList.map(function(result){return result.backdrop_path});
    setBackdropImg(imgList);
    generateTemplate(resultList);
}

(function() {
	window.lambda = {
		"images_uri": "http://image.tmdb.org/t/p",
        "timeout": 5000,
        "url": "https://fnoi0v7owa.execute-api.us-east-1.amazonaws.com/dev/list",
		call: function(success, error){
            var xhr = new XMLHttpRequest();
			xhr.timeout = lambda.timeout;
			xhr.ontimeout = function () {
				throw("Request timed out");
			};
			xhr.open("GET", lambda.url, true);
			xhr.setRequestHeader('Accept', 'application/json');
			xhr.responseType = "text";
			xhr.onreadystatechange = function () {
				if (this.readyState === 4) {
					if (this.status === 200){
						if (typeof success == "function") {
							success(JSON.parse(this.response));	
						}else{
							throw('No success callback, but the request gave results')
						}
					}else{
						if (typeof error == "function") {
							try{
                                error(JSON.parse(this.response));
                            }catch(e){
                                error({"error":"XMLHttpRequest Failed"});
                            }    
						}else{
							throw('No error callback')
						}
					}
				}
			};
			xhr.send();
		}
	}
})();

(function initApp(){
    setDateTime();
    makeLambdaCall();
    document.getElementById('list__fab').addEventListener('click',function(){
        var listDOM = document.getElementById('series-list');
        if(listDOM.style.display === "none" || listDOM.style.display === ""){
            listDOM.style.display = "inline-block";
        }else{
            listDOM.style.display = "none";
        }
    });
    setInterval(setDateTime,60000);
})();

function generateTemplate(resultList){
    var tplString = "";
    resultList.forEach(function(data,index){
        tplString += `<div class="series-list__card">
                        <span class="trend-rank">${index+1}</span>
                        <img src="http://image.tmdb.org/t/p/w200/${data.poster_path}"/>
                        <h3 class="series-name">${data.name}</h3>
                        <p title="${data.overview}" class="series-overview">${data.overview}</p>
                        <p class="series-lang">Original Language: <span>${data.original_language}</span></p>
                    </div>`;
    });
    var listDOM = document.getElementById('series-list');
    listDOM.innerHTML = tplString;
}

function ShowNotification(opts){
    var notificationTplStr = `<div class="notification ${opts.type}">
                             <p>${opts.message} <span id="notification_close">&times;</span></p>
                           </div>`;
    var mainContainer = document.getElementsByClassName('full-cover__conatiner')[0];
    var notificationDOM = generateDOMElement(notificationTplStr);
    var refDOM = document.getElementsByClassName('date-card')[0];
    mainContainer.insertBefore(notificationDOM,refDOM);
    document.getElementById('notification_close').addEventListener('click',function(e){
        notificationDOM.remove();
    });
}

function generateDOMElement(tplStr){
    var tempDom = document.createElement('div');
    tempDom.innerHTML = tplStr.trim();
    return tempDom.firstElementChild;
}

function setDataToLocalStore(resultObj){
    if(window.localStorage){
        try{
            window.localStorage.setItem('bingeTdz_cache',JSON.stringify(resultObj));
            var cachedTime = new Date().getTime();
            var refetchTime = cachedTime + (12*60*60000); // 12 hour window
            window.localStorage.setItem('bingeTdz_refetchTime',refetchTime);
        }catch(e){
            ShowNotification({type:'error',message:'Failed to cache results. Please enable LocalStorage to improve preformance.'});
        }
    }
}

function getCachedData(){
   var cachedResult =  window.localStorage.getItem('bingeTdz_cache');
   if(!!cachedResult){
       cachedResult = JSON.parse(cachedResult);
   }
   var refetchTime = window.localStorage.getItem('bingeTdz_refetchTime');
   if(!isNaN(+refetchTime)){
        refetchTime = +refetchTime;
   }else{
       refetchTime = 0;
   }
   return {
        result: cachedResult,
        refetchTime: refetchTime
   };
}
