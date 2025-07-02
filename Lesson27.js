var dataset = ee
  .ImageCollection("LANDSAT/LC09/C02/T1_L2")
  .filterDate("2022-03-01", "2022-09-01")
  .filterBounds(roi)
  .filterMetadata("CLOUD_COVER", "less_than", 10);

function applyScaleFactors(image) {
  var opticalBands = image.select("SR_B.").multiply(0.0000275).add(-0.2);
  var thermalBands = image.select("ST_B.*").multiply(0.00341802).add(149.0);
  return image
    .addBands(opticalBands, null, true)
    .addBands(thermalBands, null, true);
}

var rescale = dataset.map(applyScaleFactors);
var image = rescale.median();

var visualization = {
  bands: ["SR_B4", "SR_B3", "SR_B2"],
  min: 0.0,
  max: 0.3,
};
Map.addLayer(image.clip(roi), visualization, "Landsat 9");
Map.centerObject(roi, 10);

var training = barren.merge(forest).merge(water).merge(urban).merge(crop);

var label = "Class";
var bands = ["SR_B1", "SR_B2", "SR_B3", "SR_B4", "SR_B5", "SR_B7"];
var input = image.select(bands);

var trainImage = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30,
});
// print(trainImage);

var trainingData = trainImage.randomColumn();
var trainSet = trainingData.filter(ee.Filter.lessThan("random", 0.8));
var testSet = trainingData.filter(ee.Filter.greaterThanOrEquals("random", 0.8));

var classifier = ee.Classifier.smileRandomForest(10).train({
  features: trainSet,
  classProperty: label,
  inputProperties: bands,
});

var classified = input.classify(classifier);
// print(classified.getInfo());

var landcoverPalette = ["#0c2c84", "#e31a1c", "#005a32", "#FF8000", "#969696"];
Map.addLayer(
  classified.clip(roi),
  { palette: landcoverPalette, min: 0, max: 4 },
  "classification"
);

Export.image.toDrive({
  image: classified,
  description: "Landsat_Classified_RF",
  scale: 30,
  region: roi,
  maxPixels: 1e13,
});
