default: build

.PHONY: clean
clean:
	rm *.vsix || true

.PHONY: lint
lint:
	cd ui && npm install -f && npm run lint
	cd tfsec-task && npm install -f && npm run lint

.PHONY: build
build: clean
	cd ui && npm install -f && npm run build
	cd tfsec-task && npm install -f && npm run build

.PHONY: package
package: build
	tfx extension create --manifest-globs vss-extension.json

.PHONY: package-dev
package-dev: build
	tfx extension create --manifest-globs vss-extension.dev.json
