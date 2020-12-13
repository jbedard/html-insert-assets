# [0.13.0](https://github.com/jbedard/html-insert-assets/compare/v0.12.2...v0.13.0) (2020-12-13)


### Bug Fixes

* **test:** fix bad import of node tsconfig ([16c1e7d](https://github.com/jbedard/html-insert-assets/commit/16c1e7da8afb0070dd0bdc5fad2d49858ce1c287))


### Features

* add --help, improve error messaging ([a5e6bb1](https://github.com/jbedard/html-insert-assets/commit/a5e6bb1a80ca613fad2dee2522d2352982ca2a20))
* add --quite option to ignore known but unnecessary files such as sourcemaps ([94aeecc](https://github.com/jbedard/html-insert-assets/commit/94aeecc37806aba0159aed55bd8c9e100f0c340f))



## [0.12.2](https://github.com/jbedard/html-insert-assets/compare/v0.12.1...v0.12.2) (2020-12-12)


### Bug Fixes

* maintain node v10 support ([0211ad2](https://github.com/jbedard/html-insert-assets/commit/0211ad29821f149f11e81dee696781b79ed827f7))



## [0.12.1](https://github.com/jbedard/html-insert-assets/compare/v0.12.0...v0.12.1) (2020-12-12)


### Bug Fixes

* ensure order is maintain between --assets and --scripts/stylesheets/favicons ([30506bf](https://github.com/jbedard/html-insert-assets/commit/30506bf9af3b6da768d17022f2ecc3e21789cef1))
* **script:** fix crash when --scripts used as last arg ([dcd77dc](https://github.com/jbedard/html-insert-assets/commit/dcd77dceca4a457151e15b1c70fdaafaea9ef194))


### Code Refactoring

* **favicon:** replace non-standard "shortcut icon" with "icon" for <link rel> attribute ([fcfda0d](https://github.com/jbedard/html-insert-assets/commit/fcfda0d77a1c4b153eb6066f46093e1ce010d276))


### BREAKING CHANGES

* **favicon:** this will change the output of --assets *.ico



# [0.12.0](https://github.com/jbedard/html-insert-assets/compare/v0.11.0...v0.12.0) (2020-10-23)


### Features

* **favicon:** add --favicons for specifying favicons ([88df88e](https://github.com/jbedard/html-insert-assets/commit/88df88e60577a22b166595e2a0ed6a4789df8b35))
* **script:** allow adding multiple attributes to a <script> ([5958f28](https://github.com/jbedard/html-insert-assets/commit/5958f28ef43a71ef251a80e69ec4654ea0fda5fc))
* **stylesheets:** add --stylesheets for specifying stylesheets ([ae279fb](https://github.com/jbedard/html-insert-assets/commit/ae279fb6002d13ead056741070986f15341c0433))



# [0.11.0](https://github.com/jbedard/html-insert-assets/compare/v0.11.0-beta.0...v0.11.0) (2020-10-19)


### Bug Fixes

* fix crash when used with html5 doctype ([32cb23d](https://github.com/jbedard/html-insert-assets/commit/32cb23dd8f6c3b5546fa45323efbddef2410cd1a)), closes [#15](https://github.com/jbedard/html-insert-assets/issues/15)


### Features

* **script:** add --script for specifying script specific details ([d452e1f](https://github.com/jbedard/html-insert-assets/commit/d452e1f7f915a1db11be9a9a6cc6d66d8c69adf7)), closes [#13](https://github.com/jbedard/html-insert-assets/issues/13) [#11](https://github.com/jbedard/html-insert-assets/issues/11)



# [0.10.0](https://github.com/jbedard/html-insert-assets/compare/v0.9.0...v0.10.0) (2020-06-12)


### Features

* **cli:** provide npm package bin entry for running via cli ([ce2c8ae](https://github.com/jbedard/html-insert-assets/commit/ce2c8ae67c0594744ce09a7565e311f1f529ff44))



# [0.9.0](https://github.com/jbedard/html-insert-assets/compare/v0.8.0...v0.9.0) (2020-05-05)


### Features

* **preload:** add support for preload requests ([70ac29f](https://github.com/jbedard/html-insert-assets/commit/70ac29f068d63a4e97d8a277ab14a8236736c27a)), closes [#7](https://github.com/jbedard/html-insert-assets/issues/7)
* **stamp:** add various stamping options: ([6aff234](https://github.com/jbedard/html-insert-assets/commit/6aff234619e44f9ee1f7bdc77b833eb811d1b84a)), closes [#4](https://github.com/jbedard/html-insert-assets/issues/4)



# [0.8.0](https://github.com/jbedard/html-insert-assets/compare/v0.7.0...v0.8.0) (2020-04-05)


### Features

* add --strict to throw when unknown asset types are passed ([1192014](https://github.com/jbedard/html-insert-assets/commit/1192014faab7d679033f8226b422e6673aa3f1f1))



# [0.7.0](https://github.com/jbedard/html-insert-assets/compare/v0.6.0...v0.7.0) (2020-03-24)


### Features

* add support for external js files ([17bc413](https://github.com/jbedard/html-insert-assets/commit/17bc413fe2c53be0a2096daa9f30235eaf8e2c91))



# [0.6.0](https://github.com/jbedard/html-insert-assets/compare/v0.5.0...v0.6.0) (2020-03-12)


### Bug Fixes

* use relative URLs when resources are within a root dir ([26d7118](https://github.com/jbedard/html-insert-assets/commit/26d7118eaa73f0a3ee2b9bbcbcdf3388b298b182)


# [0.5.0](https://github.com/jbedard/html-insert-assets/compare/v0.4.3...v0.5.0) (2020-02-05)


### Bug Fixes

* support Windows paths ([#6](https://github.com/jbedard/html-insert-assets/issues/6)) ([ecf283c](https://github.com/jbedard/html-insert-assets/commit/ecf283c49e300316c281b9a30a38e6ed027b8ad9))


### Features

* add support for inserting a *.ico file as a shortcut icon ([1ad2017](https://github.com/jbedard/html-insert-assets/commit/1ad2017fd7cad5c3fdab12cd3e52fb44b023d098))



## [0.4.3](https://github.com/jbedard/insert-assets/compare/v0.4.2...v0.4.3) (2019-12-19)


### Bug Fixes

* **verbose:** add context to the stamp verbose log statement ([fd22d90](https://github.com/jbedard/insert-assets/commit/fd22d9078ff10fa42613f2ff735c4a6e5f0a7125))



## [0.4.2](https://github.com/jbedard/insert-assets/compare/v0.4.1...v0.4.2) (2019-12-18)


### Features

* add --verbose option for logging info ([4810851](https://github.com/jbedard/insert-assets/commit/4810851147430166bd19bafc5ab7b226cf7e5ccc))



## [0.4.1](https://github.com/jbedard/insert-assets/compare/v0.4.0...v0.4.1) (2019-12-11)


### Bug Fixes

* fix case where --out file is in a non-existing directory ([9caa413](https://github.com/jbedard/insert-assets/commit/9caa413aa83d2aa4ef9523fe026fff4103e3b935))
* throw when no html/out file specified ([9e0bb0b](https://github.com/jbedard/insert-assets/commit/9e0bb0bae880dfe791ca86a55f969c6f2b4d87a8))



# [0.4.0](https://github.com/jbedard/insert-assets/compare/v0.3.0...v0.4.0) (2019-12-01)


### Bug Fixes

* use relative paths from the output html dir by default ([6c34cb6](https://github.com/jbedard/insert-assets/commit/6c34cb6dad11bede97d343c9460cfa4f2e51593c)), closes [#2](https://github.com/jbedard/insert-assets/issues/2)
* **css:** fix css file paths when using --assets= style args ([6674db7](https://github.com/jbedard/insert-assets/commit/6674db7317634ecef4b053b5d56d30df4b06d1a4)), closes [#3](https://github.com/jbedard/insert-assets/issues/3)


### Reverts

* Revert "feat(*): include output directory as default root dir" ([4aac05b](https://github.com/jbedard/insert-assets/commit/4aac05b96338c4bd3f8feadabb42a77725b78519))



# [0.3.0](https://github.com/jbedard/insert-assets/compare/v0.2.0...v0.3.0) (2019-11-30)


### Features

* allow cli args of form `--arg=a` in addition to `--arg a` ([00a2524](https://github.com/jbedard/insert-assets/commit/00a2524d424a00106de45a11fef15e9accdcbd0c)), closes [#1](https://github.com/jbedard/insert-assets/issues/1)



# [0.2.0](https://github.com/jbedard/insert-assets/compare/v0.1.0...v0.2.0) (2019-11-26)


### Features

* include output directory as default root dir ([31226ae](https://github.com/jbedard/insert-assets/commit/31226ae3f03677482aea184ed004b5d2f0805856))



# 0.1.0 (2019-11-23)


### Features

* change CLI to use specific flags for input/output html, assets, root dirs ([3372b0c](https://github.com/jbedard/insert-assets/commit/3372b0c3dcdd72a3eb2f9ac5d0e18d1717aaf1bb))
* initial implementation based on https://github.com/bazelbuild/rules_nodejs/tree/0.41.0/packages/inject-html ([5033768](https://github.com/jbedard/insert-assets/commit/503376867326c9d59177215f6b94718d9de635f4))



