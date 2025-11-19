# Data-modelling

<!-- 
    Steps for Cash-to-Process (Sales Order) Flow:

    Step 1: User and Party Creation
    Step 2: Contact Mechanism Setup
    Step 3: Product and Pricing
    Step 4: Order Creation (Sales Order)
    Step 5: Order Ship Group
    Step 6: Inventory Check
    Step 7: Shipment Creation
    Step 8: Inventory Update
    Step 9: Order Completion 
-->

```mermaid
---
config:
  look: classic
  theme: redux-color
  layout: dagre
---
erDiagram
	direction BT
	USERLOGIN {
		string userLoginId PK ""  
		string partyId FK ""  
	}
	PARTY {
		string partyId PK ""  
		string partyTypeId  ""  
		string statusId  ""  
	}
	PERSON {
		string partyId PK ""  
		string firstName  ""  
		string lastName  ""  
	}
	PRODUCT {
		string productId PK ""  
		string productTypeId  ""  
		string productName  ""  
	}
	ORDERHEADER {
		string orderId PK ""  
		string partyId FK ""  
		string orderTypeId  ""  
		string statusId  ""  
		date orderDate  ""  
	}
	ORDERITEM {
		string orderId FK ""  
		string orderItemSeqId PK ""  
		string productId FK ""  
		decimal quantity  ""  
	}
	ORDERSHIPMENT {
		string orderId FK ""  
		string shipmentId FK ""  
		string orderItemSeqId FK ""  
		string shipmentItemSeq FK ""  
	}
	SHIPMENT {
		string shipmentId PK ""  
		string shipmentTypeId  ""  
		string statusId  ""  
		string facilityIdFrom FK ""  
		date shipmentDate  ""  
	}
	SHIPMENTITEM {
		string shipmentId FK ""  
		string shipmentItemSeqId PK ""  
		string orderId FK ""  
		string orderItemSeqId FK ""  
		string productId FK ""  
		decimal quantity  ""  
	}
	INVENTORYITEM {
		string inventoryItemId PK ""  
		string productId FK ""  
		string facilityId FK ""  
		decimal quantityOnHandTotal  ""  
	}
	INVENTORYITEMDETAIL {
		string inventoryItemDetailId PK ""  
		string inventoryItemId FK ""  
		decimal quantityOnHandDiff  ""  
		date inventoryDate  ""  
		string reasonEnumId  ""  
	}
	FACILITY {
		string facilityId PK ""  
		string facilityTypeId  ""  
		string facilityName  ""  
	}
    ORDERITEMSHIPGROUP {
        string orderId FK
        string shipGroupSeqId PK
        string shipmentMethodTypeId
    }
    ORDERITEMSHIPGRPINVRES {
        string orderId FK
        string shipGroupSeqId FK
        string orderItemSeqId FK
        string inventoryItemId FK
        string reserveOrderEnumId
    }
    ORDERITEMSHIPGROUP ||--o{ ORDERITEM : "contains_items"
    ORDERITEMSHIPGROUP ||--o{ ORDERITEMSHIPGRPINVRES : "inventory_reservations"
	USERLOGIN||--o{PARTY:"belongs_to"
	PERSON||--||PARTY:"is_a"
	ORDERHEADER}o--||PARTY:"placed_by"
	ORDERITEM}o--||ORDERHEADER:"contains"
	ORDERITEM}o--||PRODUCT:"refers_to"
	SHIPMENT||--o{SHIPMENTITEM:"contains"
	SHIPMENT||--o{ORDERSHIPMENT:"links_to"
	ORDERSHIPMENT}o--||ORDERHEADER:"for_order"
	SHIPMENT||--||FACILITY:"from_facility"
	INVENTORYITEM}o--||PRODUCT:"stock_of"
	INVENTORYITEM}o--||FACILITY:"stored_at"
	INVENTORYITEMDETAIL}o--||INVENTORYITEM:"detail_for"
	ORDERITEMSHIPGROUP}|--|{ORDERSHIPMENT:"  "
	style ORDERSHIPMENT stroke:#AA00FF
	ORDERSHIPMENT:::Ash

```
