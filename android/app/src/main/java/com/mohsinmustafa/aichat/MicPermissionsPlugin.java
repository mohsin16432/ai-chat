package com.mohsinmustafa.aichat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import android.Manifest;
import android.os.Build;

@CapacitorPlugin(
    name = "MicPermissions",
    permissions = {
        @Permission(
            strings = { Manifest.permission.RECORD_AUDIO },
            alias = "microphone"
        )
    }
)
public class MicPermissionsPlugin extends Plugin {

    @PluginMethod
    public void checkAudioPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        ret.put("state", getPermissionState("microphone").name().toLowerCase());
        ret.put("sdkInt", Build.VERSION.SDK_INT);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestAudioPermission(PluginCall call) {
        requestPermissionForAlias("microphone", call, "audioPermsCallback");
    }

    @PermissionCallback
    private void audioPermsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("microphone") == PermissionState.GRANTED);
        ret.put("state", getPermissionState("microphone").name().toLowerCase());
        call.resolve(ret);
    }
}
