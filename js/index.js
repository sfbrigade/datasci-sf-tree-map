/* user set variables */
var whatMap = 'neighborhoods_sffind' // which map, defined in geometa.json
var theDataFile = 'data/tree-data/neighborhood_map_metrics.csv' // csv file containing data to be mapped
var idProperty = 'Neighborhood' // geometry-identifying property in csv datafile
var dataProperty = 'Condition' // property in csv datafile containing data of interest
var color = 'Greens' // color is set by css class, see styles.css for available colors
var mapElement = '#map_container'
var bucketVal = 9
/* end user set variables */

var theMetadata
var theMapFile
var topoKey
var csvData
var mapElement = d3.select(mapElement)

var choropleth = Choropleth()
.width(parseInt(mapElement.style('width')))
.colorScheme(color)
.quanta(bucketVal)

/* ui demo elements */
/*
var bucketSel = document.getElementById('buckets');
[3,4,5,6,7,8,9,10].forEach(addOption, bucketSel);
bucketSel.onchange = function(){ choropleth.quanta(this.value) }
bucketSel.value = bucketVal
*/

var colorSel = document.getElementById('color-scheme');
['YlGn','YlGnBu','GnBu','BuGn','PuBuGn','PuBu','BuPu','RdPu','PuRd','OrRd','YlOrRd','YlOrBr','Purples','Blues','Greens','Oranges','Reds','Greys','PuOr','BrBG','PRGn','PiYG','RdBu','RdGy','RdYlBu','Spectral','RdYlGn','Accent','Dark2','Paired','Pastel1','Pastel2','Set1','Set2','Set3']
  .forEach(addOption, colorSel);
colorSel.onchange = function(){ choropleth.colorScheme(this.value) }
colorSel.value = color

/*
var srcGeo = document.getElementById('src-geo');
['Supervisor_Districts_April_2012', 'censustracts', 'elect_precincts', 'neighborhoods_analysis', 'neighborhoods_planning', 'neighborhoods_sffind', 'realtor-neighborhoods-nosimplify', 'realtor-neighborhoods', 'zipcodes']
  .forEach(addOption, srcGeo);
srcGeo.onchange = function(){
  setMap(this.value)
  d3.select('svg').remove()
  startDownloads()
}
srcGeo.value = whatMap
*/

var exampleDatasets = [
  { // Associated shape file from https://data.sfgov.org/Geographic-Locations-and-Boundaries/SF-Find-Neighborhoods/pty2-tcw4
    dataProperty: 'Condition',
    file: 'data/tree-data/neighborhood_map_metrics.csv',
    idProperty: 'Neighborhood',
    maptype: 'neighborhoods_sffind'
  }
]

/*
var dataSelEl = document.getElementById('example-data');
exampleDatasets.map(function(el){return el.file})
   .forEach(addOption,dataSelEl)
dataSelEl.onchange = function(){
  var val = this.value
  var obj = exampleDatasets.find(function(el){
    return el.file == val
  })
  setMap(obj.maptype)
  idProperty = obj.idProperty
  dataProperty = obj.dataProperty
  theDataFile = obj.file
  d3.select('svg').remove()
  startDownloads()
}
dataSelEl.value = theDataFile
*/

// Set title
var pageTitle = document.getElementById('title');
pageTitle.innerHTML = theDataFile
// pageTitle.innerHTML = theDataFile

/* end ui demo elements */

d3.json('data/geometa.json', function(err, data){
  theMetadata = data
  setMap(whatMap)
  startDownloads() //comment this line to remove draw on load
})

function startDownloads(){
  var q = d3.queue()
  q.defer(d3.csv, theDataFile)
  q.defer(d3.json, theMapFile)
  q.await(renderMap)
}

function setMap (whatMap) {
  /**
  * Set theMapFile and topoKey
  * @param {String} whatMap - the name of the map file
  */
  var dataobj = theMetadata.data.find(function(el){ return el.file === whatMap })
  theMapFile = theMetadata.path + dataobj.file + theMetadata.filetype
  topoKey = dataobj.geoproperty
  choropleth.geo(topoKey)
}

function renderMap (error, data, mapdata) {
  /**
    * Callback function after downloading csv data and topojson map
    * @param {Object} error error object
    * @param {Object} data csv data from d3.csv() call
    * @param {Object} mapdata topojson from d3.json() call
    */
  if (error) console.error(error)
  csvData = data
  var mapDict = dataToDict(csvData, idProperty, dataProperty)
  var exten = [minOfObjDict(mapDict), maxOfObjDict(mapDict)]
  choropleth.colorDomain(exten).data(mapDict)
  mapElement.datum(mapdata).call(choropleth)

  var chooserEl = document.getElementById('src-data')

  while (chooserEl.firstChild) {
    chooserEl.removeChild(chooserEl.firstChild)
  }
  Object.keys(csvData[0]).forEach(addOption, chooserEl);
  chooserEl.onchange = function(){ changeData(this.value) }

  return null
}

function addOption(el,i, arr){
  /**
  * Add option to select element, intended to be used with Array.forEach():
  * [1,2].forEach(addOption,document.getElementById('foo'))
  * @param {Object} el - what will show up as 'value' in the option
  * @param {Number} i - array index
  * @param {Array} arr - the array called by forEach
  * param {} this - passed by forEach as 'this' context
  */
  var option = document.createElement("option");
  option.value = el;
  option.text = el;
  if (el === dataProperty)
    option.selected = true;
  if (el != idProperty) //don't append the id as an option
    this.appendChild(option);
}

function changeData(dataProperty){
  /**
   * Redraw map looking at new data value
   * @param {String} dataProperty column heading of data
   */
 var mapDict = dataToDict(csvData, idProperty, dataProperty)
 var exten = [minOfObjDict(mapDict), maxOfObjDict(mapDict)]
 choropleth.colorDomain(exten).data(mapDict)
 mapElement.call(choropleth)
}

function dataToDict (data, idProp, dataProp) {
  /**
   * Turn data object into key-value pair dictionary object
   * @param {Object} data - data from csv
   * @param {String} idProp - geometry-identifying property in csv datafile
   * @param {String} dataProp - property in csv datafile containing data of interest
   * @returns {Object} nested - dictionary key-value pairs
   */
  return d3.nest()
        .key(function(d) { return d[idProp] })
        .rollup(function(p) {
          //TODO this shouldn't have to sum?
          return d3.sum(p, function(d) { return d[dataProp] })
         })
        .map(data)
}

function minOfObjDict (obj) {
  /**
   * get minimum value of dictionary object
   * @param {Object} obj - dictionary object
   * @returns {Number} minimum value
   */
  var result = Object.keys(obj).reduce(function(a, b){ return obj[a] < obj[b] ? a : b });
  return obj[result]
}

function maxOfObjDict (obj) {
  /**
  * get maximum value of dictionary object
  * @param {Object} obj - dictionary object
  * @returns {Number} maximum value
  */
  var result = Object.keys(obj).reduce(function(a, b){ return +obj[a] > +obj[b] ? a : b });
  return obj[result]
}

d3.select(window).on('resize', function(){
  var newwidth = parseInt(d3.select('#map_container').style('width'))
  choropleth.width(newwidth).resize()
});
