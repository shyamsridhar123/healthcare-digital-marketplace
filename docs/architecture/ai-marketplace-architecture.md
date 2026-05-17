```mermaid
flowchart TD
    subgraph EDGE[Edge and Identity]
        LLM[LLM Gateway]
        ENTRA[Entra ID]
        KV[Key Vault]
    end

    subgraph UX[Presentation and UX]
        WEB[Web Dashboard]
        CANVAS[Visual Orchestration]
        ADMIN[Admin Dashboard]
        PUB[Publisher Portal]
        PLAY[Playground]
    end

    subgraph API[API and Registries]
        CAT[Asset Catalog]
        MCP[MCP Server Registry]
        A2A[A2A Agent Registry]
        SKILL[Skills Registry]
        SUB[Publisher API]
        SCAN[Security Scanner]
        GW[MCP Gateway Proxy]
    end

    subgraph ORCH[Orchestration and Governance]
        OAPI[Orchestration API]
        TPL[Workflow Templates]
        EH[Event Hubs]
        ENG[Execution Engine]
        POL[Policy Engine]
        HITL[HITL Approval Gate]
    end

    subgraph DATA[Data and Observability]
        COSMOS[(Cosmos DB)]
        REDIS[(Redis Cache)]
        ADLS[(ADLS Gen 2)]
        AI[App Insights]
        MON[Azure Monitor]
    end

    subgraph AZURE[Azure AI Services]
        FOUNDRY[Azure Foundry]
        OPENAI[Azure OpenAI]
        SEARCH[AI Search]
        ACA[Container Apps]
        FUNC[Azure Functions]
    end

    LLM --> ENTRA
    LLM --> WEB
    LLM --> API

    WEB --> CAT
    WEB --> CANVAS
    CANVAS --> OAPI
    OAPI --> TPL
    OAPI --> EH
    EH --> ENG
    ADMIN --> POL
    PUB --> SUB
    PLAY --> GW

    CAT --> COSMOS
    MCP --> COSMOS
    A2A --> COSMOS
    SUB --> SCAN

    ENG --> MCP
    ENG --> A2A
    ENG --> GW
    ENG --> HITL
    POL --> KV

    GW --> LLM
    GW --> FOUNDRY

    ENG --> FOUNDRY
    ENG --> OPENAI
    CAT --> SEARCH

    ACA --> AI
    FUNC --> AI
    AI --> MON

    ENG --> REDIS
    ENG --> ADLS

    classDef edge fill:#2e7d32,stroke:#1b5e20,color:#fff
    classDef ux fill:#1565c0,stroke:#0d47a1,color:#fff
    classDef api fill:#e65100,stroke:#bf360c,color:#fff
    classDef orch fill:#ad1457,stroke:#880e4f,color:#fff
    classDef data fill:#6a1b9a,stroke:#4a148c,color:#fff
    classDef azure fill:#283593,stroke:#1a237e,color:#fff

    class LLM,ENTRA,KV edge
    class WEB,CANVAS,ADMIN,PUB,PLAY ux
    class CAT,MCP,A2A,SKILL,SUB,SCAN,GW api
    class OAPI,TPL,EH,ENG,POL,HITL orch
    class COSMOS,REDIS,ADLS,AI,MON data
    class FOUNDRY,OPENAI,SEARCH,ACA,FUNC azure
```
