var roi = ee.Geometry.Rectangle(31.56, -26.24, 31.78, -26.09);

Map.addLayer(roi, {}, "Region");
Map.centerObject(roi, 12);

var image = ee
  .ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .filterBounds(roi)
  .filterMetadata("CLOUD_COVERAGE_ASSESSMENT", "LESS_THAN", 20)
  .filterDate("2022-03-01", "2022-09-01")
  .select(["B4", "B3", "B2"])
  .median();

var rescale = image.divide(10000);

var clipImage = rescale.clip(roi);

var visParam = { bands: ["B4", "B3", "B2"], min: 0, max: 0.4 };
Map.addLayer(clipImage, visParam, "Sentinel Image");
Map.centerObject(roi, 12);

var training = image.sample({
  region: roi,
  scale: 30,
  numPixels: 5000,
});

var clusterer = ee.Clusterer.wekaKMeans(15).train(training);

var result = image.cluster(clusterer);
print("result", result.getInfo());

Map.addLayer(
  result.clip(roi).randomVisualizer(),
  {},
  "Unsupervised Classification"
);
