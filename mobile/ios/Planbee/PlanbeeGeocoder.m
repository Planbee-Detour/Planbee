#import <CoreLocation/CoreLocation.h>
#import <React/RCTBridgeModule.h>

@interface PlanbeeGeocoder : NSObject <RCTBridgeModule>
@end

@implementation PlanbeeGeocoder
RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(reverseGeocode,
                 latitude:(double)latitude
                 longitude:(double)longitude
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  CLGeocoder *geocoder = [[CLGeocoder alloc] init];
  CLLocation *location = [[CLLocation alloc] initWithLatitude:latitude longitude:longitude];
  [geocoder reverseGeocodeLocation:location completionHandler:^(NSArray<CLPlacemark *> * _Nullable placemarks, NSError * _Nullable error) {
    if (error || placemarks.count == 0) {
      reject(@"GEOCODE_FAILED", error.localizedDescription ?: @"주소를 찾지 못했습니다.", error);
      return;
    }
    CLPlacemark *placemark = placemarks.firstObject;
    NSMutableArray<NSString *> *parts = [NSMutableArray array];
    if (placemark.administrativeArea.length > 0) [parts addObject:placemark.administrativeArea];
    if (placemark.locality.length > 0) [parts addObject:placemark.locality];
    if (placemark.subLocality.length > 0) [parts addObject:placemark.subLocality];
    resolve([parts componentsJoinedByString:@" "]);
  }];
}
@end