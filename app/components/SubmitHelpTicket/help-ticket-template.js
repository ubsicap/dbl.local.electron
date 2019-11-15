import path from 'path';
import os from 'os';
import { utilities } from '../../utils/utilities';
import { servicesHelpers } from '../../helpers/services';

export const helpTicketTemplateServices = {
  getTemplate
};

export default helpTicketTemplateServices;

function getTemplate({
  userName,
  userEmail,
  workspaceName,
  router = {},
  bundleInfo = {},
  attachments = []
} = {}) {
  const template = `## Expected Behavior

  <!--- If you're describing a bug, tell us what should happen -->
  <!--- If you're suggesting a change/improvement, tell us how it should work -->

  ## Current Behavior

  <!--- If describing a bug, tell us what happens instead of the expected behavior -->
  <!--- If suggesting a change/improvement, explain the difference from current behavior -->

  ## Possible Solution

  <!--- Not obligatory, but suggest a fix/reason for the bug, -->
  <!--- or ideas how to implement the addition or change -->

  ## Steps to Reproduce (for bugs)

  <!--- Provide a video GIF screenshot, or an unambiguous set of steps to -->
  <!--- reproduce this bug. -->

  1.

  2.

  3.

  4.


  ## DBL Org / User Role / Workspace

  <!--- What DBL role were your trying to perform (archivist/publisher)? -->
  - Organization: ${workspaceName}
  - Workspace: \`${workspaceName}\`
  - User name: \`${userName}\`
  - User email: **[${userEmail}](mailto://${userEmail})**
  - Role:

  ## DBL Entry/Revision/Draft

  <!--- Which DBL entry did you encounter your issue? (provide link to entry page or Entry ID) -->
  <!--- Which Entry revision were you working with? -->
  - Entry Name: \`${bundleInfo.name}\`
  - Status Label: \`${bundleInfo.status}\`
  - Revision Label: \`${bundleInfo.revision}\`
  - Entry/Revision Url: [${bundleInfo.entryRevisionUrl}](${
    bundleInfo.entryRevisionUrl
  })
  - Language and Country: \`${bundleInfo.languageAndCountry}\`
  - Rightsholders: \`${bundleInfo.rightsHolders}\`
  - License: \`${bundleInfo.license}\`
  - Bundle: \`${bundleInfo.bundleId}\`

  ## Context

  <!--- How has this issue affected you? What are you trying to accomplish? -->
  <!--- Providing context helps us come up with a solution that is most useful in the real world -->
  - Navigation: \`${router.location.pathname}\`

  ## Your Environment

  <!--- Include as many relevant details about the environment you experienced the bug in -->

  - Nathanael Version: \`${servicesHelpers.getApp().getVersion()}\`
  - Operating System: \`${process.platform} ${os.type} ${os.release}\`
  - Electron Version: \`${process.versions.electron}\`
  - Chrome Version: \`${process.versions.chrome}\`
  - Node Version: \`${process.versions.node}\`

  ## Attachments
  ${attachments
    .map(
      attachment =>
        `- [${path.basename(
          attachment
        )}](${attachment} "${utilities.convertUrlToLocalPath(attachment)}")`
    )
    .join('\n')}
  `;
  return template;
}
