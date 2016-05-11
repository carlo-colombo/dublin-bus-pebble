if (!Array.isArray) {
    Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}

var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Accel = require('ui/accel');
var Vibe = require('ui/vibe');
var Settings = require('settings');

// Show splash screen while waiting for data
var splashWindow = new UI.Window();

// Text element to inform user
var text = new UI.Text({
    position: new Vector2(0, 0),
    size: new Vector2(144, 168),
    text:'Downloading weather data...',
    font:'GOTHIC_28_BOLD',
    color:'black',
    textOverflow:'wrap',
    textAlign:'center',
    backgroundColor:'white'
});

// Add to splashWindow and show
splashWindow.add(text);
splashWindow.show();

var options = JSON.parse(Settings.option('settings') || '[]'  )

if (!Array.isArray(options)){
    console.log('Not an array')
    options = []
}

function makeMenu(options){
    var menuItems =  options.map(function(stop, i){
        return {
            subtitle: stop.name,
            title: stop.stop + "/" + stop.line,
            stop: stop.stop,
            line: stop.line
        }
    })

    // Construct Menu to show to user
    var resultsMenu = new UI.Menu({
        sections: [{
            title: 'Stops',
            items: menuItems
        }]
    });

    return resultsMenu
}

var resultsMenu = makeMenu(options)

var selectedDetail, updating = false

function refreshDetail(e){
    var event = e
    updating = true
    console.log("Refreshing info for stop", e.item.title)
    var title = e.item.title
    ajax({
        url: 'https://bus.litapp.xyz/stops/' + e.item.stop,
        type: 'json'
    },function(data){
        updating = false
        var content = data.timetable
                .map(function(row){
                    var theLine = row.line == e.item.line
                    return ( theLine? '> ' : '') + row.line +' ' +row.time + ( theLine? ' <' : '')
                }).join('\n')

        for(var rowIndex in data.timetable){
            if(data.timetable[rowIndex].line == e.item.line){
                var time44 = data.timetable[rowIndex].time
                break
            }
        }

        if(time44 && ~~time44.indexOf(":")){
            var eta = parseInt(time44)
        }

        var delay

        if (eta <= 2){
            delay = 30
        }else if(eta <= 5){
            delay = 60
        }else if(eta <=10){
            delay = 120
        }else {
            delay = 300
        }
        delay=delay||30
        console.log("Delay is "+delay+" s")

        if(time44 == "Due"){
            Vibe.vibrate('double');
        }

        if(selectedDetail){
            selectedDetail.hide()
        }

        var detailCard = selectedDetail = new UI.Card({
            title: title + " (" + delay/60 + "')",
            body: content,
            scrollable:true
        });
        detailCard.show();
        Vibe.vibrate('short');

        var timerId = setTimeout(function(){
            console.log("Timer running")
            refreshDetail(event);
        }, delay*1000);

        console.log("Setting up timer " + timerId + " delay " + delay)

        detailCard.on('hide', function(){
            console.log('hiding card, remove timer '+ timerId)
            clearTimeout(timerId)
        })

        detailCard.on('click','select', function(e){
            console.log("force updating")
            if(!updating) {
                refreshDetail(event);
            }else{
                console.log('already updating')
            }
        })
    },function(){
        updating = false
    })
}

resultsMenu.on('select', refreshDetail)

// Show the Menu, hide the splash
resultsMenu.show();
splashWindow.hide();

Settings.config({
    url: "https://carlo-colombo.github.io/dublin-bus-pebble-configurator",
}, function(){
    console.log('opened')
},function (e){

    Settings.option("settings", JSON.stringify(e.options))

    options = e.options
    resultsMenu.hide()
    resultsMenu.hide()
    resultsMenu = makeMenu(e.options)
    resultsMenu.show()

    // Show the raw response if parsing failed
    if (e.failed) {
        console.log(e.response);
    }
})
