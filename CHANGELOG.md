### Version 0.51.6 (Help > Give feedback (YouTrack))

#### Fix

- fix empty workspace list (catch and log errors that happen during apiBundle conversion)

### Version 0.51.5 (Help > Give feedback (YouTrack))

#### Fix

- dbl_dot_local_app (1/17/2020) : edp/fix_wizard_remove_existing_source_structure

### Version 0.51.4 (Help > Give feedback (YouTrack))

#### Fix

- dbl_dot_local_app (12/9/2019) : mvh/return_to_the_wizards (Video wizard and checks support mpg and mp4)

### Version 0.51.3 (Help > Give feedback (YouTrack))

#### Fix

- Make separate menu for Give feedback
- Provide more screen area for markdown editor

### Version 0.51.2 (Help > Give feedback (YouTrack))

#### Fix

- Don't crash `Help > Give feedback` for many entries
- Add navigation actions to log

### Version 0.51.1 (Help > Give feedback (YouTrack))

#### Fix

- dbl_dot_local_app (11/26/2019): mvh/return_to_the_wizards (Set up peripheral names for video)

### Version 0.51.0 (Help > Give feedback (YouTrack))

#### Feature

- Add `Help > Give feedback` to other browser windows
- dbl_dot_local_app (11/22/2019): mvh/return_to_the_wizards (peripheral name support)

#### Fix

- dbl_dot_local_app (11/22/2019): mvh/return_to_the_wizards (don't crash due to desktop.ini)

### Version 0.50.1 (Help > Give feedback (YouTrack))

#### Fix

- Fix Nathanael issueTags

### Version 0.50.0 (Help > Give feedback (YouTrack))

#### Feature

- Allow user to select Feedback type (Bug Report or Feature Request)
- Submit feedback to "Digital Bible Library Support" YouTrack group
- Add user to "All relevant emails" lists in YouTrack issue
- Add `Nathanael` tag to youtrack issues

### Version 0.49.0 (Help > Give feedback (YouTrack))

#### Feature

- Added `Help > Give feedback` to send user feedback and attachments to YouTrack

#### Fix

- Fix `File > Switch Workspace`
- Detach and reattach debugger if already attached

### Version 0.48.2 (DDL fix source element errors)

#### Fix

- Auto delete corrupted bundles when logging into dbl_dot_local_app
- Fix metadata.xml validation errors caused by empty source/structure or source/canonicalContent elements.
- dbl_dot_local_app (10/25/2019): mvh/fix_for_randy2

### Version 0.48.1 (Capture HTTP ERRORS in logs)

#### Fix

- try fix error "UnhandledRejection Error: Reducers may not dispatch actions." for "progress > 100%" error.

### Version 0.48.0 (Capture HTTP ERRORS in logs)

#### Feature

- Capture all HTTP ERRORS in logs

#### Fix

- (Really) Fix Help > Open Error Log... to not duplicate errors
- Catch publication wizard error in Resources dialog to allow app to continue without spinning loading forever.

### Version 0.47.5 (Fix logs)

#### Fix

- Fix Help > Open Log... to capture more logging information
- Fix Help > Open Error Log... to limit to 1MB size and 3 backups
- Fix storing user's email addresses with multiple periods
- Fix Resources dialog with more detailed step-by-step instructions

### Version 0.47.4 (Fix Adding Audio Resources)

#### Fix

- DDL crash `local variable 'canonical_elements' referenced before assignment when adding a resource`
- Upgrade dbl_dot_local_app master: fix_for_randy (10/14/2019)

### Version 0.47.2 (Context Menu for Browser)

#### Fix

- Remove caching of resources so that right ones get exported
- Don't open devTools by default
- Upgrade dbl_dot_local_app master: Fix conflict with video wizard (9/26/2019)

### Version 0.47.1 (Context Menu for Browser)

#### Fix

- Upgrade dbl_dot_local_app cleaner_cli (9/25/2019)

### Version 0.47.0 (Context Menu for Browser)

#### Feature

- Add Edit > Find / Next / Backward to Browser Menus

### Version 0.46.0 (Context Menu for Browser)

#### Feature

- Add Copy menu item to context-menu in extra browser windows (e.g. logs, metadata, reports, etc...)
- Catch more DDL errors

#### Fix

- Upgrade dbl_dot_local_app cleaner_cli (9/24/2019)

### Version 0.45.1 (Error log)

#### Fix

- restore disappearing progress bar due to (SSE vs. `bundle_status.xml`) timing issue with getting `upload` mode
- Fix some download/cleaup errors related to multiple publications include the same resources
- Fix bundleId in Error debug IN_PROGRESS dump
- Upgrade dbl_dot_local_app cli_tool (9/19/2019)

### Version 0.45.0 (Error log)

#### Feature

- Help > Open Error Log...
- Help > Open Log... now uses browser window and watches for updates
- Keep track of session errors in bottom DBL bar

#### Fix

- Upgrade dbl_dot_local_app checks_and_wizards (9/16/2019)

### Version 0.44.2 (Debug progress bar)

#### Fix

- Experimental debug for progress bar issues

### Version 0.44.1 (Fix Upgrade metadata to 2.2.1)

#### Fix

- Upgrade dbl_dot_local_app versions_are_not_floats (9/12/2019)

### Version 0.44.0 (Upgrade metadata to 2.2.1)

#### Feature

- On click Login button, upgrade workspace config.xml to create new drafts with metadata 2.2.1
- Upgrade dbl_dot_local_app metadataVersions (9/11/2019)

### Version 0.43.0 (Capture console log)

#### Feature

- Help > Open Log... now captures most of what gets sent to console.log

#### Fix

- Fix resource pubPath canonComponent/bookNum for certain publications

### Version 0.42.0 (Upload Form)

#### Feature

- Add Upload form so user can run checks, enter archive comment, and see rightsHolders prior to upload
- Added Upload form to bottom of Entry Drawer
- Added field errors Badge to Metadata Entry Drawer item

### Version 0.41.1 (Metadata > Save as template)

#### Fix

- Save metadata template folder if it already exists but isn't in the workspace's `config.xml`
- dbl_dot_local_app (7/31/2019): braille output_mapping

### Version 0.41.0 (Metadata > Save as template)

#### Feature

- Add secondary button `Save as [or Overwrite] ... template` in Metadata page.
- Automatically setup Metadata template folder for workspace when saving as template

#### Fix

- Fix timing issues exporting `metadata.xml` e.g. opening in browser window
- Fix issues saving deleted workspace settings

### Version 0.40.3 (Select Recently Selected Resources)

#### Fix

- Select only the resources that were most recently added `By File` or `By Folder`

### Version 0.40.2 (Containers)

#### Fix

- Greater user control/consistency over container behavior when adding resources by File or by Folder
- Always have input mapper match on all added (staged) files

### Version 0.40.1 (Import / Converters)

#### Fix

- Respect any edited containers when adding resources to entry manifest

### Version 0.40.0 (Import / Converters)

#### Feature

- Include ffmpeg (vob) and sox (wav) for audio converters

### Version 0.39.2 (Export / Converters)

#### Fix

- Fix spinning circle on Export / Convert button
- Remember last exported folder for entry (session only)

### Version 0.39.1 (Export / Converters)

#### Fix

- Added "Export selected resources As Is" option to export option table
- Better counting for Export / Converters button in Resource dialog
- Only include stored resources in export count
- Remove overwrites column for exports
- Try fix metadata.xml export to include latest changes (adding resources to the manifest)

### Version 0.39.0 (Export / Converters & Download as Publisher)

#### Feature

- Added Export / Converters table & button for Resource dialog (e.g. timing files)
- Workspace Settings > added switch "Download as Publisher" for Content Contributor (IPC)
- dbl_dot_local_app (6/26/2019)
  - overwrites for output mappers
  - assorted offline report and JSON versification generation code
  - support for "download as publisher, upload as archivist" for Compass Braille

### Version 0.38.0 (Resource publication columns)

#### Feature

- added pubPath, role, and pub columns to Resources table

### Version 0.37.5

#### Fix

- fix clean all resource percentage. (separate resources stored from files stored).
- dbl_dot_local_app (5/28/2019) - tweak schema to better handle sign language video

### Version 0.37.4

#### Fix

- fix some react textHighlight related crashes due to undefined strings
- try fix upload state

### Version 0.37.3

#### Fix

- dbl_dot_local_app (5/16/2019): metadata_as_json (boost api performance)
- fix api calls to take advantage of api performance boost

### Version 0.37.1

#### Fix

- move entry drawer to right side (and close icon to the left)
- dbl_dot_local_app (5/13/2019): find matching job and cancel_old_upload_jobs

### Version 0.37.0

#### Feature

- upgrade Electron / boilerplate

### Version 0.36.0

#### Feature

- allow resume upload if upload job had stopped
- dbl_dot_local_app(5/7/2019): auto link upload job

### Version 0.35.4

#### Fix (Report - Checks - Stylesheet)

- close all child windows (e.g. report, metadata) if main app is closed
- dbl_dot_local_app(4/25/2019): Fix regex for checking source files

### Version 0.35.3

#### Fix (Report - Checks - Stylesheet)

- dbl_dot_local_app(4/24/2019): Match 3-digit chapter numbers (PSA)

### Version 0.35.2

#### Fix (Report - Checks - Stylesheet)

- add gray badge to SKIP status

### Version 0.35.1

#### Feature (Report - Checks - Stylesheet)

- add bootstrap type stylesheet to checks report
- add verbose title to checks report

### Version 0.34.2

#### Fix

- dbl_dot_local_app (4/17/2019) - include all recent changesets in master

### Version 0.34.1

#### Fix

- dbl_dot_local_app (4/17/2019) - retry on 408 errors (AGAIN)
- changed Entry dialog Menu icon (3 stacked lines) to More icon (3 stacked dots)

### Version 0.34.0 (Workspace Settings - Metadata Templates)

#### Feature

- Add Metadata Template Folder chooser for {medium}.xml templates
- Add checkboxes to ipc/lch chooser

### Version 0.33.2

#### Fix

- preserve user's table page (don't jump to page 1 if user selects row on page 2)

### Version 0.33.1

#### Fix

- save user's selected table pagination option
- dbl_dot_local_app: retry 408 errors as non-fatal (e.g during uploads)

### Version 0.33.0

#### Feature

- Add better table page options (last option being the total resources)

#### Fix

- Fix: hide "Edit containers" box while adding resources

### Version 0.32.0

#### Feature

- Add Reports to entry side-menu

#### Fix

- Fix clipboard listener after computer comes back from sleep/hibernation

### Version 0.31.2

#### Fix

- (really) allow download of resources when some have already been stored and others have been revised
- Fix click handlers in resources dialog
- don't responsively hide checkbox column
- keep header row showing in table while scrolling
- keep add button showing while scrolling
- Disable selecting rows when adding/loading resources

### Version 0.31.1

#### Fix

- allow download of resources when some have already been stored and others have been revised

### Version 0.31.0

#### Features

- upgrade table component with filter, searching, paging and to improve performance
- show reduction of selected items to add as they are being added

### Version 0.30.1

#### Features

- Add Revisions to side-menu (drawer) to allow user to switch to/from it
- Try to show more info as resources are being added
- Try to improve performance of adding many resources
- Add debounce to Edit Container suggestions
- dbl_dot_local_app (3/7/2019) - fix video role/wizard

#### Fixes

- Fix resource dialog state to not crash and show trash icon

### Version 0.29.2

#### Fixes

- Fix upload status progress to avoid seeming stuck at the end sometimes

### Version 0.29.1

#### Fixes

- Fix `Actions must be plain objects` warning

### Version 0.29.0 (Debug Info for Adding Resources)

#### Features

- Add info (job_spec.xml) button for uploading
- dbl_dot_local_app (3/5/2019) canonicalContent in audio wizard

#### Fixes

- fix crash saving overrides
- fix allow user to cancel adding resources
- fix performance while adding lots of resources
- dbl_dot_local_app (3/5/2019) Removed dbl_lock, resource writing performance logs
- dbl_dot_local_app (3/4/2019) Added single-threaded endpoints
- dbl_dot_local_app (3/4/2019) Braille wizard fixes
- dbl_dot_local_app (3/4/2019) Fixes promotion editing

### Version 0.28.1 (Debug Info for Adding Resources)

#### Fixes

- Add some debug info to discover missing resources bug

### Version 0.28.0 (Navigation Drawer for Resources/Metadata)

#### Features

- Add navigation drawer for switching between stored Resources and Metadata
- "Review metadata.xml" (in drawer) now opens in electron's native Chrome browser
- "Review metadata.xml" auto-refreshes when the metadata.xml changes on disk
- "Review metadata.xml" windows allows File > Save To
- dbl_dot_local_app 2/25/2019 (video/braille wizard fixes)

### Version 0.27.1

#### Fixes

- Fix crash after deleting draft when trying to re-save starred entries

### Version 0.27.0

#### Features

- Add clipboard tooltip to Paste button
- Add medium to clipboard tooltip
- Add medium icon to Edit metadata title

#### Fixes

- When user deletes bundle, cleanup obsolete starred entries
- Load manifest resources count for fetched Revisions

### Version 0.26.1 (Starred entries)

#### Fixes

- Fix search box for entries to work again

### Version 0.26.0 (Starred entries)

#### Features

- Allow users to star entries they are working with
- Allow users to filter on starred entries
- Save user's starred entries and filter settings

### Version 0.25.0 (Show Entry DBL Id)

#### Features

- Show searchable DBL Id in entries
- Save user's workspace entry search results

#### Fixes

- fit entry rows into responsive grid
- fix wait until all entries are loaded before updating search input

### Version 0.24.0 (Change Workspaces location)

#### Features

- Allow user to change workspaces location
- Save user name (email) for login
- Add checkboxes to multi-select control (Canonical Components) in edit forms
- Reverse Canonical Component options (westernNT/OT at top)
- Show order of selected components in options

- dbl_dot_local_app 2/01/2019 (including more print bundle support)

#### Fixes

- turn off polling for dbl_dot_local_app connection after leaving login page

### Version 0.23.0 (Copy metadata)

#### Features

- Added View metadata for non-draft bundles
- In View/Edit metadata, added checkboxes for copying/pasting metadata sections via Copy button
- In Edit metadata, added Paste button
- show medium icon on clipboard
- show tooltip with name and revision information on clipboard
- In Resources dialog, removed checksum column
- In Resources dialog, fixed multiple table update issues
- In Resources dialog, improved performance when adding several files (e.g. by Folder)

- dbl_dot_local_app 1/28/2019 (including more print bundle support)

#### Fixes

- fixed button behaviors via power monitor to resume SSE connection when system comes back from sleep etc...
- In Edit metadata, fixed publication Save/Undo button for factories

### Version 0.22.1

#### Fixes

- Fix revisions dialog to not have `Copy For Paste` button

### Version 0.22.0 (Copy/Paste resources)

#### Features

- Add `Copy for Paste` button in Resources dialog
- Add clipboard icon to bundles appbar when copy has happened
- update dbl_dot_local_app (1/10/2019 copyResources, braille)

#### Fixes

- remove tooltip from ConfirmButton (so it doesn't interfere with clicks)
- fix some table update issues (including size/checksums for added files)
- fix fetch manifest resources for previous revision
- fix Download dialog to not auto-select disabled rows
- don't clear clipboard after pasting

### Version 0.21.0

#### Features (Manage Resources Dialog - mapping converters)

- show/select available mapping converters
- show Rev badge after users selects row when there are later revisions
- update dbl_dot_local_app to 12/18/2018

#### Fixes

- fix medium icon for Save As options
- fix status for previous manifest resources
- only disable selecting revised resources in drafts.

### Version 0.20.0

#### Features (Manage Resources Dialog - discard / revision status)

- added `Clean () / Discard ()` button to indicate how many newly added resources will be discarded from manifest
- added `Add () / Revise ()` button to indicate how many resources will be change files from previous revision
- added status `add (revise)?` for files with same uri target as previous revision
- added status `added` for resources that have been added since previous revision
- added column `stored` to indicate if is resource is stored locally
- added folder, medium icons, and background for Rev link in app bar
- moved DevTools to Help menu (Shift+CntrlOrCmd+I)
- added status `deleted` to indicate it has been removed since previous revision
- disable `revised` and `deleted` rows
- update dbl_dot_local_app to 12/11/2018.

#### Fixes

- try to do better at capturing error logs (that can be filtered).

### Version 0.19.1

#### Fixes

- don't show empty list after deleting manifest resource on bundle with no stored resources
- prevent same bundle from getting added to app state multiple times (due to race conditions)

### Version 0.19.0

#### Features (Manage Resources Dialog)

- add medium badge to folder icon
- add ability to delete selected resources from manifest
- add ability to clean selected resources
- add confirm buttons to operations
- button row style changes
- update dbl_dot_local_app to 12/05/2018

#### Fixes

- removed call to updateManifestResource() (now handled internally by postResource)
- fewer locking issues when adding resources (and run wizards after all complete)

### Version 0.18.0

#### Features (in Edit metadata dialog)

- Offer Delete Button for optional forms
- Add background to active form
- Condense navigation buttons and add tooltips
- Show more errors related to required (factory) forms that aren't present
- Change button/badge style for navigate to Next form error

#### Fixes

- remove some "flashing" of buttons during state transitions.

### Version 0.17.0

#### Features

- Added Revision badge to indicate user has newer choices or drafts to choose
- Re-added link to DBL (revision) webpage in Revisions dialog
- Upgraded dbl_dot_local_app to 11/26/2018

#### Fixes

- fix links to open DBL webpage (due to missing https)
- save webpage host to include https when saving config.xml
- fix bundles to reset state when switching workspaces
- disable revisions earlier than 2.x
- fix revisions sorting logic
- fix state when deleting draft after selecting an earlier revision

### Version 0.16.1

#### Fixes

- update dbl_dot_local_app to dbl_info_endpoints changeset (11/13/2018)

### Version 0.16.0

#### Features

- change Rev into button where user can select revision
- Add Revisions count and button to Remove Empty/Unused Revisions

#### Fixes

- really wait until start/stop create mode when opening dialogs to editing metadata/resources

### Version 0.15.1

#### Features

- add dialog "Install Updates?" after updates are downloaded
- add mimeType for mp4

#### Fixes

- don't show config.xml file in log

### Version 0.14.1

#### Fixes

- don't shut down SSE channel on first error (detect when dbl_dot_local_app has really shutdown)
- sort by medium before revision

### Version 0.14.0

#### Features

- increase height of progress bar
- added upload queue status
- update download/upload queue status whenever file transfers
- show demimals for upload/download progress

#### Fixes

- dbl_dot_local_app video and audio templates
- rename Atoms to Resources in download queue tooltip
- fix eventSource to shutdown after killing dbl_dot_local_app process
- Show files remaining to download in initial download queue status
- try keep (revision 0) bundles sorted in a more stable order

### Version 0.13.2

- Update dbl_dot_local_app to latest (11-02-2018)
- Skip calculating checksums for files over 250MB

### Version 0.13.1

#### Fixes

- don't get stuck in Uploading mode if something goes wrong (return to store mode)
- waitUntil in create mode before opening/closing Edit and Add Resources dialogs
- Fix SSE to happen at login time, don't ever disconnect SSE, (and don't refresh all items if already loaded)

### Version 0.13.0

#### Features

- login page now waits until dbl_dot_local_app ready before enabling Login button
- Add resource dialog shows applicable wizard documentation
- Add file count to Add/Download button for resource dialogs

#### Fixes

- enable login when user saves workspace Settings
- rename config.xml.template and dbl_dot_local_app.exe (Conditionally append .exe for windows only for compatibility with linux/macOs installations)
- when adding resources, dbl_dot_local_app expires locks after 5 seconds to avoid hang (eternal red circle)
- fix braille wizard endpoint (ignore empty uri path)

### Version 0.12.3

#### Fixes

- Fix add bundles (don't throw any any dispatches during throttle)
- Improve performance (via immutable js) for code that may be run often

### Version 0.12.2

#### Fixes

- Fix multiple performance issues

### Version 0.12.1

#### Fixes

- Fix "Login to Unknown Workspace" button

### Version 0.12.0

#### Features

- DBL dot local handles downloads for licensed and open access entries
- DBL dot local can be fed parameter for where to locate the config.xml
- Added Workspaces (so access tokens can have their own set of bundles, esp helpful for users who have roles on multiple organizations)
- Don't offer workspace login button until user has saved Settings
- Provide a button to Login to Unknown workspace if DBL dot local service is already running
- Added a workspace Settings form to configure config.xml (host, access tokens, organization type, open access)
- For entries list, added bottom status bar showing download queue and number of entries vs. filtered
- Display rightsholders and license info in columns
- Blue colored drafts indicate a new entry, red colored indicate revision.
- Added "Save as (New)" Button to copy metadata into another entry
- Rename former "Save As" button to "Export To"
- Link in the Resources dialog for users to Go Fix canon spec components now opens the relevant section in metadata to edit
- Auto-run best publication wizard whenever user changes the canon spec components
- Added asterick (\*) labels to help identify which sections in metadata are required
- display error message if "DblAppException" happens in context of login
- DBL dot local now shows all its activity in the log
- Added badge for Edit button to show errors that need to be fixed in metadata
- Show all errors in metadata
- Allow user to step through metadata sections with errors
- Added more human readable errors
- Kill spawned dbl_dot_local process on logout

#### Fixes

- DBL dot local no longer hangs (e.g. when adding resources)

### Version 0.10.0

#### Features

- Create new bundles (audio, video, print, text, braille)
- Add resources by File or Folder
- Add multiple canon spec components

### Version 0.9.2

#### Fixes

- Fixed `dbl_dot_local.exe` hang after (200kb) maxBuffer is reached for unused stdin and stdout pipes.

### Version 0.9.1

#### Fixes

- 'spawn' `dbl_dot_local.exe` so that it doesn't terminate after maxBuffer is reached.

### Version 0.9.0

#### Features

- signed nathanael installer with Windows security certificate
- run `dbl_dot_local.exe` as sub-process of nathanael (closes on exit)
- `File > Import config.xml` (& exit) for `dbl_dot_local.exe`
- `File > Export config.xml`

##### Bundle Rows

- Added user's name to app bar
- Only list latest revision (or draft), ordered by language code/country then by name
- Added [**Rev**] button to open DBL entry page
- Added [**Revise**] button to create `Draft`
- Added [**Edit**] button to edit metadata
- Added [**Delete**] button to delete `Draft`
- Added 'Stored' n-file count to show n-files downloaded
- Added [**Upload**] button for

##### Edit Metadata

- Show metadata forms in terms of collapsible/expandable tree
- Added [**Review**] button to show latest state of metadata.xml
- Added [**Save**]/[**Undo**] buttons when editing metadata
- Show errors in tree when trying to save invalid metadata
- Added [**Delete**] for factory instance forms
- Automatically cleanup/delete bundles that are not the latest revision (and have no resources downloaded)

#### Fixes

- Better performance when loading stored status on rows

### Version 0.8.0

#### Features

- add language and country code column (and sort first by it)

### Version 0.7.3

#### Fixes

- fix production build errors "TypeError: Assignment to constant variable."
- disabled regex search (to allow quoting anything)

### Version 0.7.2

- add version number to Nathanael app title

#### Fixes

- don't close SSE channel for errors. (Just log them).
- fix apply search to progress update text
- fix search bug
- fix unresponsive UI due to search
- don't erase spaces from user search input
- fix status based on mode and downloaded resources vs. manifest
- added code to determine whether to update highlighting

### Version 0.7.1

#### Fixes

- Fix status (e.g. downloading) while loading & sorting other rows.
- Fix File > Bundles (demo)

### Version 0.7.0

#### Features

- Added AppMenuBar with Search box always visible at top when scrolling
- Added Media icons (text, audio, video, print)

### Version 0.6.1

#### Fixes

- fix Downloading message handling from latest dbl_dot_local

### Version 0.6.0

#### Features

- Add new entry rows after DBL dot Local discovers and downloads their metadata

#### Fixes

- Improved Search input performance
- Improved scroll bar performance when loading new entries
- Improved entry row selection (toggling tray menu)
- Filter out rows that are missing name (possibly loading_metadata)

### Version 0.5.0

#### Features

- Add Clean (Resources) tray button
- Sort revisions in descending order
- Add basic edit functions (Copy/Paste)

#### Fixes

- Fix downloaded status if user has used Clean
- Close eventSource on error or if making a new eventSource (due to login or switching page)
- Fix missing name from metadata.xml bug (a.k.a loading_metadata)

### Version 0.4.2

#### Fixes

- Fix download and Save To progess in production builds
- (for now) Sort bundles by name, so bundles don't unexpectedly change order when reopening Nathanael

### Version 0.4.0

#### Features

- Download from DBL
- Enable Click "Save To" folder
- Show Download and "Save To" Progress
- Parse history to determine if downloaded
- Enable Click Info (to open DBL entry in browser)
- Disable unused/invalid tray menu buttons

#### Fixes

- clear search on location change. feed searchInput from prop
- fix circular progress to happen on loading

### Version 0.3.0

#### Features

- Add highlighting to buttons!
- By default load bundles from dbl dot local api
- Can access `File > Bundles (Demo)` for demo list (w/o login)
- Changed "Completed" status to "Downloaded" or "Uploaded"
- Uses bundle history to determine status

#### Fixes

- Fixed operating system paths in `Help > Open Log`
- Styled top-right icons with more padding
- Styled wider login user/password
- Styled login loading animation margin
- Fix loading dev tools/menu on `did-finish-load` so dev tools do not cover up UI.
- Fix context menu so `Inspect element` doesn't keep popping up by only loading dev tools first time menu is installed.

# 0.2.1

#### Features

- Added Open Log to the Help menu

#### Fixes

- Fix status column
- Fix highlighting to have zero padding (+ bolded)

# 0.2.0

#### Features

- Search/Filter bundles and highlight matches

# 0.1.0

#### Features

- File > Login
- File > Bundles (Demo)
- Auto-update
