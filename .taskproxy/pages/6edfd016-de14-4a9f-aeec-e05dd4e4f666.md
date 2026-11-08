<webui-data data-page-title="Release" data-page-subtitle=""></webui-data>

# Release

<webui-page-segment>

Build Sitemap and Increment Patch Version

```pwsh
./PowerShell/BuildSiteMap.ps1
./PowerShell/IncrementVersion.ps1
```

Build Sitemap

```pwsh
./PowerShell/BuildSiteMap.ps1
```

Build Static Pages

```pwsh
webapp_post_build
```

Increment Patch Version

```pwsh
./PowerShell/IncrementVersion.ps1
```

</webui-page-segment>
