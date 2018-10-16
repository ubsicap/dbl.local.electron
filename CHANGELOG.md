### Version 0.11.0
- begin handleCheckAllAndClose
- rework manifest count to be lazy loaded after row is loaded or draft resources are updated
- fix lazy updating of bundle (not uploading of bundle)
- lazy load formsErrorStatus
- show badge with formsError count
- disable upload if has forms errors
- try to refactor get form errors to editMetadataService
- fix crash and margin
- begin conditionally render next button
- begin to try to show all errors in a form
- add react-scroll module for scroll-to support
- fix reload lazyLoads after reloading entire list
- preserve complete formErrors and errorTree. track currentFormNumWithErrors
- begin try jumping to specified formKey
- update bundle in saveMetadata and handle state changes
- fix save w/bundle update
- add nextFormWithErrors
- fix stepper to be able to go to the next invalid form
- try to jump to edit metadata at given formKey
- fix jump to formKey
- goto step with longest matching formKey. if no moveNext is defined, then default to opening first steps.
- initialize edit form to first form with errors (if any)
- only show Save/Undo if form has changes
- add human readable rules
- better resetting of forms errors (e.g. click Undo and manual undo)
- begin adjusting current/next form errors
- better handling of current/next form on navigation
- fix crash in save request when clicking Save button
- add comment for obscure critical code
- open first node if no other matches are present
- redo/fix opening first node if no other matches are present
- add rightsHolders column
- add rightsHolders icon and tooltip
- add license info
- cleanup license, rightholders
- disable edit/revise/upload if bundle is not owned
- mask confusing value from error feedback
- add middleWare to detect saving publication forms to run publication wizards
- fix getPublicationInstances
- begin refactor to show document_issues
- show document_issues as errors
- try to override error icon
- begin updating metadata sources when relationships have been specified
- separate Edit/Revise into create draft revision
- exclude metadata.xml from added resource files
- add button to create new entry from another entry
- modify new to Rev 1 (New)
- add another sub menu for new media types. added visual icons
- don't close row after clicking submenu
- change to Save As (New) and Export To
- don't close row if escaping from sub menu
- handle forkBundle and compare dblId of parent to determine forked state
- fix sse stack for adding forked bundle
- make owned icon bold
- allow user to do Save As for non-owned entries
- move link to DBL entry closer to name
- jslint cleanup
- begin remove demo stuff
- begin WorkspacesPage
- begin filling in template with workspace content
- rename Album to WorkspacesPage
- add workspaces.service
- show workspaces and names
- bold Login
- hookup create new workspace
- paramaterize starting dbl_dot_local.exe process with path to config.xml. add workspace card click handlers stubs
- begin loginToWorkspace action
- fix mysterious crash for missing localStorage
- remove login menu item
- hookup login page to workspace
- add xml2js module
- handle open-access licenses
- combine workspaces and login page
- make login a separate page.
- combine workspace/login button. add logout (workspaces) menu
- logout in Workspaces page (begin_WorkspacePage)
- begin logic to edit (or copy and edit) config.xml
- read in config file
- more refactoring
- disable login if settings do not exist
- try to kill spawned dbl_dot_local process on logout
- allow user to login to unknown workspace. manage killing process on logout
- wording
- fix login/logout workflow
- remove link to DBL after killing DBL process
- remove # from 'open-access' display
- disable upload for new draft without resources
- start getting WorkspaceEditDialog working
- don't render dialog until ready
- create import/export settings
- make errorText for empty organizationType
- Actually save settings
- refactoring to updateAndWriteConfigXmlSettings()
- finish rename workspace name. eslint cleanup
- refactor more code to dblDotLocalService
- always try to sync paths in config.xml before using it to launch dbl_dot_local.exe
- really update new workspace
- filenamify error
- begin adding error messages to invalid forms
- add validation for other fields
- fix saving false boolean value
- begin collecting pre-validation errors
- refactor so login is disabled when any errors will appear in settings form
- Fix creating new workspace
- fix creating new workspace even more
- add button to delete workspace
- add tooltip to delete icon
- don't allow login to unknown workspace when terminating process
- rename state property
- try to fix state issues between known/unknown processes
- more state cleanup
- try to be smart about saving downloadOpenAccessEntries
- eslint
- don't store settings if none exist
- fix blank page in production version
- don't clear search when history changes
- begin DblDotLocalAppBar
- display status bar on bottom, number of rows/possible.
- add list icon
- add tooltip
- add download queue to bar
- fix bar ui
- separate download status from entries count
- fix open edit settings when the workspace has no config.xml settings
- remove some console.log messages

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
- Can access `File > Bundles (Demo)` for demo list  (w/o login)
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