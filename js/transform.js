
var openBackgroundTag = false;

function clearText(elem) {
  document.getElementById(elem).value='';
}

function generate() {
  var x, i, y, xmlDoc, contentNode, firstChildOfContent, currentNode;
  var obj = {"data":{"scenes":{}},"current":{"scene":"","character":"","legend":""}
   };

  var source = document.getElementById('fdx').value;
  parser = new DOMParser();
  xmlDoc = parser.parseFromString(source,"text/xml");
  // documentElement always represents the root node
  console.log(xmlDoc.documentElement);
  console.log(xmlDoc.getElementsByTagName("Content")[0]);
  console.log(get_firstChild(xmlDoc.getElementsByTagName("Content")[0]));

  contentNode = xmlDoc.getElementsByTagName("Content")[0];

  x=contentNode.childNodes;
  console.log("all children");
  console.log(x);

  firstChildOfContent=get_firstChild(xmlDoc.getElementsByTagName("Content")[0]);
  console.log("the loop");
  console.log(obj);
  //formulate JSON with the right structuire from FDX
  for (i = 0; i < x.length ;i++) {
    if (x[i].nodeType == 1 ) {
      //console.log(x[i]);
      console.log(i);
      try {
        console.log(x[i].getAttribute("Type")+": "+get_firstChild(x[i]).childNodes[0].nodeValue);
        let type=x[i].getAttribute("Type");
        let value=get_firstChild(x[i]).childNodes[0].nodeValue;
        obj = addToJSON(type.toLowerCase(),value,obj);

      } catch (err) {
        console.log(err);
      }
    }
  }

  document.getElementById("sceneJSON").innerHTML = JSON.stringify(obj);
}
function compose(sceneJson,scenePick,choicePick) {
  //compose('sceneJson','scenePick','choicePick')
  var obj = document.getElementById("sceneJSON").innerHTML;
  var scene = document.getElementById("scenePick").innerHTML;
  var choice = document.getElementById("choicePick").innerHTML;

  composeAudio(obj, scene, choice);
}

function composeAudio(obj, scene, choice) {
  obj=JSON.parse(obj);
  console.log(obj);
  //console.log(obj.data);
  //console.log(obj.data.scenes);
  let currentText = obj.data.scenes[scene].main.text;
  //console.log(currentText);
  let transitionText =obj.data.scenes[scene][choice].text;
  //console.log(transitionText);
  let nextScene = obj.data.scenes[scene][choice].nextScene;
  console.log(nextScene);
  curry(obj.data.scenes,nextScene);
  curry(obj.data.scenes[nextScene],"main");
  let nextText = obj.data.scenes[nextScene].main.text;
  console.log(nextText);
  let speechOutput={"current":{"scene":scene,"text":""},"next":{"scene":nextScene,"text":""}};
  //console.log(speechOutput);
  let head =`<head><style>${obj.data.scenes.legendStyles}</style></head>`;
  let open = '<stream xmlns="http://talestreamer.ai/schema/tsml" style="volume-profile: prenormalized">';
  let current = currentText.join(" ");
  let transition = transitionText.join(" ");
  let next = nextText.join(" ");
  let close = '</stream>';

  speechOutput.current.text=open+head+current+close;
  speechOutput.current.text=speechOutput.current.text.replace(/(\")/g,"&#39;");
  speechOutput.next.text=open+head+transition+next+close;
  speechOutput.next.text=speechOutput.next.text.replace(/(\")/g,"&#39;");



  document.getElementById("talestreamerCurrent").innerHTML = speechOutput.current.text;
  document.getElementById("talestreamerNext").innerHTML = speechOutput.next.text;
}

function addToJSON(type, value, obj) {
  //console.log("in addJson");
  type=type.toLowerCase();
  let returnVal;
  switch(type) {
    case "scene heading":
        console.log("in Scene Heading");
        value=value.toLowerCase();

        //close background if it's open before switching scenes
        if (openBackgroundTag) {
          console.log("in openBackgroundTag");
          speechOutput=`</span>`;
          openBackgroundTag=false;
          obj.data.scenes[obj.current.scene][obj.current.transition].text.push(speechOutput);
        }
        //console.log(obj);

        //check for scene key and create if it doesn't exist.
        curry(obj.data.scenes,value);

        //is there a transition?
        if (obj.current.transition==null) {
          //default the transition to "main"
          obj.current.transition="main";
        }

        //is there text and next scene?
        if (!obj.data.scenes[value].hasOwnProperty(obj.current.transition)) {
          //default the transition to "main"
          obj.data.scenes[value][obj.current.transition]="";
        }

        //is there text and next?
        if (!obj.data.scenes[value][obj.current.transition].hasOwnProperty('text')) {
          //default the transition to "main"
          obj.data.scenes[value][obj.current.transition]={"text":[],"nextScene":""};
        }

        //set current scene
        obj.current.scene=value;

        //old start
        // curry(obj.data.scenes,value);
        // //initialize the new scene
        // obj.current.scene=value;
        // obj.current.transition="main";
        // obj.data.scenes[value][obj.current.transition]={"text":[],"nextScene":""};
        // //obj.data.scenes[value][obj.current.transition].text = [];
        // obj.current.character="";
        // console.log(obj);
        //old finish

        returnVal = obj;

        break;
    case "character":
        value=value.toLowerCase();
        obj.current.character=value.split(' ').join('_');
        returnVal = obj;

        break;
    case "action":
        console.log("in action");
        obj.current.character="alexa";
        //intentionally left the break out. action and dialogue have a common code block.
    case "dialogue":
        //TODO error checking
        console.log("in dialog");
        console.log(obj.current.scene);
        //check for transition key
        curry(obj.data.scenes[obj.current.scene],obj.current.transition);
        if (obj.current.character!="user" && obj.current.scene!="legend" ){
          let speechOutput = `<span class='${obj.current.character}'> ${value} </span>`;
          console.log(`why speechOutput: ${speechOutput}`);
          obj.data.scenes[obj.current.scene][obj.current.transition].text.push(speechOutput);
        }
        if (obj.current.scene=="legend") {
          let legend = `.${obj.current.character}{ voice: ${value}} `;
          //console.log(`legend: ${legend}`);
          curryWithType(obj.data.scenes,"legendStyles","");
          //console.log(obj.data.scenes.legendStyles);
          obj.data.scenes.legendStyles+=legend;
        }
        //console.log(obj);
        returnVal = obj;
        break;
    case "parenthetical":
        console.log("in parenthetical");
        //example value:
        //src="http://s3.amazonaws.com/magicdoor.huntwork.net/library/MagicDoor_GhostCaptain.mp3" style="start: 146; end: 151.3; volume: 5db"
        //TODO open the background span
        //style="background-sound: https://s3.amazonaws.com/magicdoor.huntwork.net/library/ts_intro/bg.mp3; background-volume: loud"
            //example value:
            //src="http://s3.amazonaws.com/magicdoor.huntwork.net/library/MagicDoor_GhostCaptain.mp3" style="start: 146; end: 151.3; volume: 5db"


        let isBackground = (value.search("background-sound:")!=-1);
        let isEnd = (value.search("background-end")!=-1);

        //check for transition key
        curry(obj.data.scenes[obj.current.scene],obj.current.transition);
        if (obj.current.character!="user"){

          value = value.replace("(","").replace(")","");
          let speechOutput="";
          if (isBackground) {
            if (openBackgroundTag) {
              speechOutput=`</span>`;
              openBackgroundTag=false;
            }
            speechOutput += `<span ${value}>`;
            speechOutput=speechOutput.replace(/(\")/g,"&#39;");

            openBackgroundTag=true;
          } else if (isEnd) {
            speechOutput=`</span>`;
            openBackgroundTag=false;
          } else {
            speechOutput = `<audio ${value}></audio>`;
            speechOutput=speechOutput.replace(/(\")/g,"&#39;");

          }
            obj.data.scenes[obj.current.scene][obj.current.transition].text.push(speechOutput);


        }
        //console.log(obj);
        returnVal = obj;
        break;
    case "transition":
        value=value.toLowerCase();
        console.log("in transition");
        console.log(obj);
        //format is: transition > nextScene
        value = value.replace(":","");
        let arr= value.split(">").map(item => item.trim());
        console.log(arr);
        let newTransition = arr[0];
        let newNextScene = arr[1];

        obj.current.transition=newTransition;
        curry(obj.data.scenes[obj.current.scene],newTransition);
        obj.data.scenes[obj.current.scene][newTransition].nextScene=obj.current.scene;
        obj.data.scenes[obj.current.scene][newTransition].text=[];
        //set the next scene. By default, we use the current scene unless it's settings
        if (arr.length>0) {
          //we have a transition and a next scene
          obj.data.scenes[obj.current.scene][newTransition].nextScene=newNextScene;
        }

        console.log(obj);
        returnVal = obj;
        break;
    case "new act":
        returnVal = obj;
        break;
    case "end of act":
    //TODO close the background span
        returnVal = obj;
        break;
    case "scriptnote":
        returnVal = obj;
        break;
    default:
      returnVal = obj;
      }
  return returnVal;
}



function curryWithType(key,value,type) {
  console.log("in curry");
  if(key.hasOwnProperty(value)){
    //console.log(`${value} exists under ${key}`);
  } else {
    //create the key
    key[value]=type;
    //console.log(`${key} ${value} adding ${key[value]}`);

    //obj.current.scene=value.toLowerCase();
  }
}

function curry(key, value) {
  curryWithType(key, value, JSON.parse('{}'));
}

function get_nextSibling(n) {
    var y = n.nextSibling;
    while (y.nodeType != 1) {
        y = y.nextSibling;
    }
    return y;
}

function get_firstChild(n) {
    var y = n.firstChild;
    while (y.nodeType != 1) {
        y = y.nextSibling;
    }
    return y;
}
