default: build

.PHONY: clean
clean:
	rm *.vsix || true

.PHONY: lint
lint:
	cd tfsec-task && npm run lint
	cd ui && npm run lint

.PHONY: build
build: clean lint
	cd ui && npm install -f && npm run build
	cd tfsec-task && npm install -f && npm run build

.PHONY: package
package: build
	tfx extension create --manifest-globs vss-extension.json
