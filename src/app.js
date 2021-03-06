var appKey = '4EBM';

var UI = require('ui');
var Vector2 = require('vector2');
var Ajax = require('ajax');

var todayString = "Today";
var overdueString = "overdue";

var loading = new UI.Window();
var loadingBackground = new UI.Rect({position: new Vector2(0,0), size: new Vector2(144,168)});
var loadingText = new UI.Text({ position: new Vector2(0, 60), size: new Vector2(144, 20),
                               text:"Loading...", textAlign:"center", backgroundColor:"white",
                               color:'black'});
loading.add(loadingBackground);
loading.add(loadingText);
loading.show();

var token;

function displayMessage(title, subtitle) {
  var card = new UI.Card();
  card.title(title);
  if(subtitle) {
    card.subtitle(subtitle);
  }
  card.show();
}
function displayMessageWithSubtitle(subtitle) {
  var card = new UI.Card({
    subtitle:subtitle,
    scrollable:true
  });

  card.show();
}


Pebble.addEventListener('showConfiguration', function(e) {
  // Show config page
  Pebble.openURL('http://x.SetPebble.com/'+ appKey +'/' + Pebble.getAccountToken());
});


Pebble.addEventListener('appmessage', function(e) {
  var key = e.payload.action;
  if (typeof(key) != 'undefined') {
    var settings = localStorage.getItem(appKey);
    console.log("settings: " + settings);
    if (typeof(settings) == 'string') {
      try {
      Pebble.sendAppMessage(settings);
      } catch (exception) {
      }
  }
  var request = new XMLHttpRequest();
  request.open('GET', 'http://x.SetPebble.com/api/' + appKey + '/' + Pebble.getAccountToken(), true);
  request.onload = function(e) {
    if (request.readyState == 4)
      if (request.status == 200)
        try {
          Pebble.sendAppMessage(JSON.parse(request.responseText)["1"]);
        } catch (exception) {
        }
  };
  request.send(null);
  }
});


Pebble.addEventListener('webviewclosed', function(e) {
  if ((typeof(e.response) == 'string') && (e.response.length > 0)) {
    try {
      console.log("response : " + e.response);
      Pebble.sendAppMessage(JSON.parse(e.response)["1"]);
      localStorage.setItem(appKey, JSON.parse(e.response)["1"]);
    } catch(exception) {
    }
  }
});

function completeItem(menu, sectionIndex, menuItemIndex, menuItem) {
  if(menuItem.item) {
    console.log('id ' + menuItem.item.id);
    var id = JSON.stringify([menuItem.item.id]);
    var checked = menuItem.item.checked;
    var url;
    if(checked) {
      url = 'https://todoist.com/API/uncompleteItems?token='+token+"&ids="+ id;
    } else {
      url = 'https://todoist.com/API/completeItems?token='+token+"&ids="+ id+"&in_history=0";
    }
    Ajax(
      {
        url: url,
        type: 'json',
      },
      function(data) {
        menuItem.item.checked = !menuItem.item.checked;
        if(checked) {
          menu.item(sectionIndex, menuItemIndex, {title:menuItem.title, item:menuItem.item, icon:''});
        } else {
          menu.item(sectionIndex, menuItemIndex, {title:menuItem.title, item:menuItem.item, icon:'images/checkmark.png'});
        }
      },
      function(error) {
        console.log(error);
      }      
    );
    console.log(menuItem.icon);
  } else {
     displayMessage('Error');
  }
}

function replaceGmail(item) {
  if (item.content.search(/^https:\/\/mail.google.com/) === 0){
    var rpl = item.content.match(/\((.+)\)/);
    item.content = item.content.replace(/^.*$/, rpl[1]);
    return item;
  }
}

function clickOnItemProject(item) {
  if(item.custom) {
    if(item.title == todayString) {
      queryToday();
    }
  } else {
    displayProject(item.project);
  }
}

function queryToday() {
    var itemsMenu = new UI.Menu({
  sections: [{
      title: overdueString,
      items: []
    }, {
      title: todayString,
      items: []
    }]
  });
  Ajax(
  {
    url: 'https://todoist.com/API/query?token='+token+"&queries="+JSON.stringify([todayString, overdueString]),
    type: 'json',
  },
  function(data) {
      console.log(data);
      console.log('data: '+ JSON.stringify(data, null, 4));
    
    var itemOverdue = data[1].data;
    var itemToday = data[0].data;
    var itemListFromData = [];
    itemListFromData = itemListFromData.concat(itemOverdue);
    itemListFromData = itemListFromData.concat(itemToday);    

    if(itemListFromData && itemListFromData.length > 0) {
      var itemsMenuOverdue = [];
      var itemsMenuToday = [];
      itemOverdue.forEach(function(item, index, array) {
        var icon = item.checked ? 'images/checkmark.png' : '';
        replaceGmail(item);
        itemsMenuOverdue.push({title:item.content, item:item, icon:icon});
      });
      itemToday.forEach(function(item, index, array) {
        var icon = item.checked ? 'images/checkmark.png' : '';
        replaceGmail(item);
        itemsMenuToday.push({title:item.content, item:item, icon:icon});
      });
      
      itemsMenu.items(0,itemsMenuOverdue);
      itemsMenu.items(1,itemsMenuToday);
      itemsMenu.on('select', function(e) {
        completeItem(e.menu, e.sectionIndex, e.itemIndex, e.item);
      });
      itemsMenu.on('longSelect', function(e) {
        displayMessageWithSubtitle(e.item.item.content);
      });
      itemsMenu.show();   
    } else {
      displayMessage(todayString, "No tasks today");
    }
  },
  function(error) {
    console.log('fail to query today');
    console.log(error);
  }
);
}

function displayProject(project) {
  var itemsMenu = new UI.Menu({
  sections: [{
      title: project.name,
      items: []
    }]
  });
  Ajax(
  {
    url: 'https://todoist.com/API/getUncompletedItems?token='+token+"&project_id="+project.id,
    type: 'json',
  },
  function(data) {
    if(data && data.length > 0) {
    console.log(data);
    console.log('data: '+ JSON.stringify(data, null, 4));
    var items = [];
    data.forEach(function(item, index, array) {
      var icon = item.checked ? 'images/checkmark.png' : '';
      replaceGmail(item);
      items.push({title:item.content, item:item, icon:icon});
    });
    itemsMenu.items(0,items);
    itemsMenu.on('select', function(e) {
      completeItem(e.menu, e.sectionIndex, e.itemIndex, e.item);
    });
    itemsMenu.on('longSelect', function(e) {
      displayMessageWithSubtitle(e.item.item.content);
    });
    itemsMenu.show(); 
    } else {
      displayMessage(project.name, "No tasks to display");
    }
  },
  function(error) {
    console.log('fail with project id ' + project.id);
    console.log(error);
  }
);
}

function loadProjects() {
  if(token) {
    Ajax(
      {
        url: 'https://www.todoist.com/API/getProjects?token='+token,
        type: 'json'
      },
      function(data) {
        var menu = new UI.Menu({
          sections: [{
            title: 'Projects',
            items: []
          }]
        });
        loading.hide();
        console.log('data: '+ JSON.stringify(data, null, 4));
        
        var projects = [];
        projects.push({title:todayString, project:null, custom:true});
        data.forEach(function(project, index, array) {
          projects.push({title:project.name, project:project, custom:false});
        });
        menu.items(0,projects);
        menu.on('select', function(e) {
          clickOnItemProject(e.item);
        });
        menu.show();
      },
      function(error) {
        loading.hide();
        if(!error) {
          displayMessage('Network', 'No network, or network problem');
        } else {
          console.log("token :" + token);
          console.log(error);
          displayMessage('Token ID', 'Error, bad token');
        }
      }
    );
  } else {
    displayMessage('Token ID', 'Please set your token ID in the app\'s settings');
  }
}
token = localStorage.getItem(appKey);
loadProjects();