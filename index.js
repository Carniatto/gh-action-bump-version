const { Toolkit } = require('actions-toolkit')
const { execSync } = require('child_process')

// Run your GitHub Action!
Toolkit.run(async tools => {
  const pkg = tools.getPackageJSON()
  const event = tools.context.payload

  console.log('sucker7', event.pull_request);
  console.log('sucker7', event.pull_request.commits);
  // const messages = event.pull_request.commits.map(commit => commit.message + '\n' + commit.body)

  // const commitMessage = 'version bump to'
  // const isVersionBump = messages.map(message => message.toLowerCase().includes(commitMessage)).includes(true)
  // if (isVersionBump) {
  //   tools.exit.success('No action necessary!')
  //   return
  // }

  let version = 'prepatch'
  // if (messages.map(message => message.includes('BREAKING CHANGE')).includes(true)) {
  //   version = 'minor'
  // } else if (messages.map(message => message.toLowerCase().startsWith('feat')).includes(true)) {
  //   version = 'patch'
  // }

  if (event.pull_request.title.indexOf('feat(')) {
    version = 'patch'
  }

  try {
    const current = pkg.version.toString()
    // set git user
    await tools.runInWorkspace('git', ['config', 'user.name', '"riaktr-account"'])
    await tools.runInWorkspace('git', ['config', 'user.email', '"it@riaktr.com"'])

    const peps = await tools.runInWorkspace('git', ['log'])

    console.log('sucker8', peps)
    console.log('sucker', process.env.GITHUB_REF)

    const currentBranch = event.pull_request.head.ref
    console.log('currentBranch:', currentBranch)

    // do it in the current checked out github branch (DETACHED HEAD)
    // important for further usage of the package.json version
    await tools.runInWorkspace('npm',
      ['version', '--allow-same-version=true', '--git-tag-version=false', current])
    console.log('current:', current, '/', 'version:', version)
    let newVersion = execSync(`npm version --git-tag-version=false ${version}`).toString().trim()
    await tools.runInWorkspace('git', ['commit', '-a', '-m', `"ci: bump to ${newVersion}"`])

    // now go to the actual branch to perform the same versioning
    await tools.runInWorkspace('git', ['checkout', currentBranch])
    await tools.runInWorkspace('npm',
      ['version', '--allow-same-version=true', '--git-tag-version=false', current])
    console.log('current:', current, '/', 'version:', version)
    newVersion = execSync(`npm version --git-tag-version=false ${version}`).toString().trim()
    newVersion = `${process.env['INPUT_TAG-PREFIX']}${newVersion}`
    console.log('new version:', newVersion)
    await tools.runInWorkspace('git', ['commit', '-m', `"ci: Bump to ${newVersion}"`])

    const remoteRepo = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`
    // console.log(Buffer.from(remoteRepo).toString('base64'))
    // await tools.runInWorkspace('git', ['tag', newVersion])
    await tools.runInWorkspace('git', ['push', remoteRepo])
    await tools.runInWorkspace('git', ['push', remoteRepo])
  } catch (e) {
    tools.log.fatal(e)
    tools.exit.failure('Failed to bump version')
  }
  tools.exit.success('Version bumped!')
})
