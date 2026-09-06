package com.planbee

import android.location.Address
import android.location.Geocoder
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

class PlanbeeGeocoderModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "PlanbeeGeocoder"

  @ReactMethod
  fun reverseGeocode(latitude: Double, longitude: Double, promise: Promise) {
    if (!Geocoder.isPresent()) {
      promise.reject("GEOCODER_UNAVAILABLE", "이 기기에서 주소 변환을 사용할 수 없습니다.")
      return
    }
    Thread {
      try {
        val addresses: List<Address>? = Geocoder(reactApplicationContext, Locale.KOREA)
          .getFromLocation(latitude, longitude, 1)
        val address = addresses?.firstOrNull()
        val region = listOfNotNull(address?.adminArea, address?.locality, address?.subLocality)
          .distinct()
          .joinToString(" ")
        if (region.isBlank()) promise.reject("ADDRESS_NOT_FOUND", "주소를 찾지 못했습니다.") else promise.resolve(region)
      } catch (error: Exception) {
        promise.reject("GEOCODE_FAILED", error.message, error)
      }
    }.start()
  }
}