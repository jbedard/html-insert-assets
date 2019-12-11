## [0.4.1](https://github.com/jbedard/insert-assets/compare/v0.4.0...v0.4.1) (2019-12-11)


### Bug Fixes

* fix case where --out file is in a non-existing directory ([9caa413](https://github.com/jbedard/insert-assets/commit/9caa413aa83d2aa4ef9523fe026fff4103e3b935))
* throw when no html/out file specified ([9e0bb0b](https://github.com/jbedard/insert-assets/commit/9e0bb0bae880dfe791ca86a55f969c6f2b4d87a8))



# [0.4.0](https://github.com/jbedard/insert-assets/compare/v0.3.0...v0.4.0) (2019-12-01)


### Bug Fixes

* use relative paths from the output html dir by default ([6c34cb6](https://github.com/jbedard/insert-assets/commit/6c34cb6dad11bede97d343c9460cfa4f2e51593c)), closes [#2](https://github.com/jbedard/insert-assets/issues/2)
* **css:** fix css file paths when using --assets= style args ([6674db7](https://github.com/jbedard/insert-assets/commit/6674db7317634ecef4b053b5d56d30df4b06d1a4)), closes [#3](https://github.com/jbedard/insert-assets/issues/3)


### Features

* allow cli args of form `--arg=a` in addition to `--arg a` ([00a2524](https://github.com/jbedard/insert-assets/commit/00a2524d424a00106de45a11fef15e9accdcbd0c)), closes [#1](https://github.com/jbedard/insert-assets/issues/1)


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



