.PHONY: help node frontend indexer

help:
	@echo "SocialFi Protocol — run each in a separate terminal:"
	@echo ""
	@echo "  make node       Start the Substrate dev node"
	@echo "  make frontend   Start the React frontend"
	@echo "  make indexer    Start the event indexer"

node:
	./scripts/start-dev.sh

frontend:
	./scripts/start-frontend.sh

indexer:
	./scripts/start-indexer.sh
