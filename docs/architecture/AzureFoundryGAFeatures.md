Azure Foundry Capabilities - GA Features for East US / East US 2
Complete Feature Matrix
Capability / Feature	GA Status (East / East US 2)	Private Endpoints / VNet Support	How You Use It (incl. Orchestration)
Foundry projects & new portal	✅ GA in East & East US 2	✅ Project endpoints can be locked behind private networking when Agent Service is configured with VNet/PE	Central place to define agents, tools, data connections, and manage environments that MAF/LangGraph will call into
Foundry Agent Service – core agents (prompt/tool agents)	✅ GA	✅ Supported via Standard Setup with VNet integration and private endpoints; agents run inside a secured runtime	Create single‑ or multi‑tool agents; call them from apps, MAF, or LangGraph via Responses APIs or SDKs
Threads, runs, messages (conversation state)	✅ GA	✅ Same private networking as Agent Service; thread and run APIs reside behind the project endpoint	Agent orchestration primitives: threads carry multi‑step/multi‑agent conversations; runs represent each agent execution step
File Search & vector stores (RAG)	✅ GA as Agent Service feature with quotas	✅ Backing storage/search can be private (Storage + AI Search with private endpoints) and reached via Foundry VNet	Attach files/vector stores to agents for RAG; MAF/LangGraph simply call the agent, which internally uses File Search
Models via Foundry (Azure OpenAI & partners)	✅ GA model set per region; East/East 2 are primary GA regions	✅ Model deployments can be placed behind private endpoints or in the same VNet; Agent Service calls them privately	Agents (or your MAF/LangGraph code) call these models via the Responses/Foundry Models APIs
Azure AI Search as a tool	✅ GA in East/East 2 as a service	✅ Supports private endpoints; Agent Service can reach indexes via VNet integration	Use as a tool in Foundry agents for RAG/search‑heavy scenarios; MAF/LangGraph see search as just another agent tool call
MCP tools (servers you host)	✅ Tooling pattern GA; support documented with Foundry Agent Service	✅ Host MCP servers in Container Apps/App Service with private endpoints/peering; Agent Service reaches them over the VNet	Expose internal systems as tools; orchestrating agents (Foundry, MAF, LangGraph) call MCP tools through Agent Service
Private networking for Agent Service (Standard Setup)	✅ GA	✅ BYO VNet, private endpoints, private DNS, deny‑by‑default outbound rules	Ensures all agent/model/tool traffic is private; MAF/LangGraph call Agent Service through private endpoints if needed
Entra ID, RBAC, managed/Agent identities	✅ GA	✅ Works with private networking; identities used to access private resources (Search, Storage, Fabric, MCP)	Secure access to Foundry and downstream resources; agents authenticate to tools via managed identity or Agent Identity
Foundry multi‑agent patterns (single orchestrator agent calling others)	✅ Supported on top of GA Agent Service primitives; patterns promoted in GA docs/blogs	✅ Same private networking as core agents	Define an orchestrator agent and several specialist agents; orchestrator delegates via tools/agent calls within Foundry
Multi‑agent workflows (visual/YAML workflows in Foundry)	⚠️ Available but workflow layer parts remain preview	✅ Can run in VNet‑isolated Agent Service environments	Visual/YAML orchestration of multiple agents with branching and human‑in‑the‑loop; for GA‑only, treat cautiously and verify preview flags
Hosted agents (containers on Agent Service)	❌ Preview (not GA)	⚠️ Can run in VNet but still preview	Run LangGraph/MAF as containers managed by Foundry; for GA‑only, avoid in first wave
Integration: Foundry as provider to MAF	✅ Supported via MicrosoftFoundryAgentProvider / AzureAIProject/Agent client; built as part of the modular stack	✅ You can host MAF in Container Apps/App Service and have it call Agent Service via private endpoints	MAF orchestrator remains in your compute; Foundry provides agents/models/tools as GA backend with governance
Integration: Foundry with LangGraph	✅ Official docs & samples show LangGraph calling Foundry agents/models via AgentServiceFactory; LangGraph runtime remains your compute	✅ LangGraph in Container Apps can reach Foundry via private endpoints and send OpenTelemetry to Azure Monitor	Use LangGraph as orchestrator; Foundry hosts individual agents/tools; combine with MAF if needed for system integration
Legend
✅ GA = Generally Available, production-ready with SLA

⚠️ Preview elements = Some components still in preview

❌ Preview = Not recommended for GA-only deployments

Recommended GA-Only Architecture (East US 2)
Orchestration Layer
Run MAF and/or LangGraph in Azure Container Apps or App Service (your infrastructure)

Full control over compute, scaling, and observability

Agent & Model Layer
Use Foundry Agent Service (GA) for agents, models, File Search, and tools

Deploy inside VNet-integrated, private-endpoint setup

What to Avoid for GA-Only
❌ Hosted agents (still preview)

❌ Any features explicitly marked "preview" in documentation

Key Observations
East US 2 is a tier-1 region for Foundry with maximum feature availability

Private networking is GA and fully supported for production workloads

Orchestration flexibility: Choose between Foundry-native orchestrator agents or external orchestrators (MAF/LangGraph)

OpenTelemetry integration works across all layers for unified observability