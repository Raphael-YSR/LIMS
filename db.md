parceldb=# \dt
                 List of relations
 Schema |         Name          | Type  |  Owner
--------+-----------------------+-------+----------
 public | administrative_units  | table | postgres
 public | applications          | table | postgres
 public | land_use_types        | table | postgres
 public | parcels               | table | postgres
 public | parties               | table | postgres
 public | registration_sections | table | postgres
 public | rrrs                  | table | postgres
 public | source_documents      | table | postgres
 public | spatial_ref_sys       | table | postgres
 public | surveys               | table | postgres
 public | transactions          | table | postgres
 public | valuations            | table | postgres
(12 rows)


parceldb=# \d administrative_units
                            Table "public.administrative_units"
        Column        |           Type           | Collation | Nullable |      Default
----------------------+--------------------------+-----------+----------+-------------------
 admin_unit_id        | uuid                     |           | not null | gen_random_uuid()
 name                 | character varying(255)   |           | not null |
 unit_type            | character varying(100)   |           | not null |
 county_code          | character varying(10)    |           |          |
 parent_admin_unit_id | uuid                     |           |          |
 date_created         | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated         | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "administrative_units_pkey" PRIMARY KEY, btree (admin_unit_id)
    "administrative_units_county_code_key" UNIQUE CONSTRAINT, btree (county_code)
    "idx_admin_units_type_name" btree (unit_type, name)
Foreign-key constraints:
    "administrative_units_parent_admin_unit_id_fkey" FOREIGN KEY (parent_admin_unit_id) REFERENCES administrative_units(admin_unit_id)
Referenced by:
    TABLE "administrative_units" CONSTRAINT "administrative_units_parent_admin_unit_id_fkey" FOREIGN KEY (parent_admin_unit_id) REFERENCES administrative_units(admi
n_unit_id)
    TABLE "registration_sections" CONSTRAINT "registration_sections_admin_unit_id_fkey" FOREIGN KEY (admin_unit_id) REFERENCES administrative_units(admin_unit_id)
Triggers:
    trg_administrative_units_update_timestamp BEFORE UPDATE ON administrative_units FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d applications
                               Table "public.applications"
       Column       |           Type           | Collation | Nullable |      Default
--------------------+--------------------------+-----------+----------+-------------------
 application_id     | uuid                     |           | not null | gen_random_uuid()
 application_type   | character varying(100)   |           | not null |
 submission_date    | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 status             | character varying(50)    |           | not null |
 applicant_party_id | uuid                     |           | not null |
 parcel_id          | uuid                     |           |          |
 assigned_staff_id  | uuid                     |           |          |
 approval_date      | timestamp with time zone |           |          |
 notes              | text                     |           |          |
 date_created       | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated       | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "applications_pkey" PRIMARY KEY, btree (application_id)
    "idx_applications_status_type" btree (status, application_type)
Foreign-key constraints:
    "applications_applicant_party_id_fkey" FOREIGN KEY (applicant_party_id) REFERENCES parties(party_id)
    "applications_assigned_staff_id_fkey" FOREIGN KEY (assigned_staff_id) REFERENCES parties(party_id)
    "applications_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
Referenced by:
    TABLE "transactions" CONSTRAINT "transactions_application_id_fkey" FOREIGN KEY (application_id) REFERENCES applications(application_id)
Triggers:
    trg_applications_update_timestamp BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d land_use_types
                             Table "public.land_use_types"
      Column      |           Type           | Collation | Nullable |      Default
------------------+--------------------------+-----------+----------+-------------------
 land_use_type_id | uuid                     |           | not null | gen_random_uuid()
 zoning_code      | character varying(50)    |           | not null |
 description      | text                     |           |          |
 date_created     | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated     | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "land_use_types_pkey" PRIMARY KEY, btree (land_use_type_id)
    "land_use_types_zoning_code_key" UNIQUE CONSTRAINT, btree (zoning_code)
Referenced by:
    TABLE "parcels" CONSTRAINT "fk_land_use_type" FOREIGN KEY (current_land_use_type_id) REFERENCES land_use_types(land_use_type_id)
Triggers:
    trg_land_use_types_update_timestamp BEFORE UPDATE ON land_use_types FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d parties
                                          Table "public.parties"
               Column               |           Type           | Collation | Nullable |      Default
------------------------------------+--------------------------+-----------+----------+-------------------
 party_id                           | uuid                     |           | not null | gen_random_uuid()
 party_type                         | character varying(50)    |           | not null |
 first_name                         | character varying(100)   |           |          |
 last_name                          | character varying(100)   |           |          |
 organization_name                  | character varying(255)   |           |          |
 staff_role                         | character varying(100)   |           |          |
 national_id_or_registration_number | character varying(50)    |           |          |
 contact_email                      | character varying(255)   |           | not null |
 password_hash                      | character varying(255)   |           |          |
 contact_phone                      | character varying(50)    |           |          |
 address                            | text                     |           |          |
 date_created                       | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated                       | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 kra_pin                            | character varying(50)    |           |          |
Indexes:
    "parties_pkey" PRIMARY KEY, btree (party_id)
    "idx_parties_contact_email" btree (contact_email)
    "idx_parties_kra_pin" btree (kra_pin)
    "idx_parties_national_id" btree (national_id_or_registration_number)
    "idx_parties_party_type" btree (party_type)
    "parties_contact_email_key" UNIQUE CONSTRAINT, btree (contact_email)
    "parties_national_id_or_registration_number_key" UNIQUE CONSTRAINT, btree (national_id_or_registration_number)
Referenced by:
    TABLE "applications" CONSTRAINT "applications_applicant_party_id_fkey" FOREIGN KEY (applicant_party_id) REFERENCES parties(party_id)
    TABLE "applications" CONSTRAINT "applications_assigned_staff_id_fkey" FOREIGN KEY (assigned_staff_id) REFERENCES parties(party_id)
    TABLE "rrrs" CONSTRAINT "rrrs_party_id_fkey" FOREIGN KEY (party_id) REFERENCES parties(party_id)
    TABLE "source_documents" CONSTRAINT "source_documents_related_party_id_fkey" FOREIGN KEY (related_party_id) REFERENCES parties(party_id)
    TABLE "surveys" CONSTRAINT "surveys_surveyor_party_id_fkey" FOREIGN KEY (surveyor_party_id) REFERENCES parties(party_id)
    TABLE "transactions" CONSTRAINT "transactions_initiating_party_id_fkey" FOREIGN KEY (initiating_party_id) REFERENCES parties(party_id)
    TABLE "transactions" CONSTRAINT "transactions_receiving_party_id_fkey" FOREIGN KEY (receiving_party_id) REFERENCES parties(party_id)
    TABLE "valuations" CONSTRAINT "valuations_valuer_party_id_fkey" FOREIGN KEY (valuer_party_id) REFERENCES parties(party_id)
Triggers:
    trg_parties_update_timestamp BEFORE UPDATE ON parties FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d valuations
                               Table "public.valuations"
     Column      |           Type           | Collation | Nullable |      Default
-----------------+--------------------------+-----------+----------+-------------------
 valuation_id    | uuid                     |           | not null | gen_random_uuid()
 parcel_id       | uuid                     |           | not null |
 market_value    | numeric(20,2)            |           | not null |
 valuation_date  | date                     |           | not null |
 valuer_party_id | uuid                     |           | not null |
 assessed_value  | numeric(20,2)            |           |          |
 valuation_notes | text                     |           |          |
 date_created    | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated    | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "valuations_pkey" PRIMARY KEY, btree (valuation_id)
    "idx_valuations_parcel_date" btree (parcel_id, valuation_date)
Foreign-key constraints:
    "valuations_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    "valuations_valuer_party_id_fkey" FOREIGN KEY (valuer_party_id) REFERENCES parties(party_id)
Triggers:
    trg_valuations_update_timestamp BEFORE UPDATE ON valuations FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d transactions
                                 Table "public.transactions"
        Column         |           Type           | Collation | Nullable |      Default
-----------------------+--------------------------+-----------+----------+-------------------
 transaction_id        | uuid                     |           | not null | gen_random_uuid()
 transaction_date      | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 transaction_type      | character varying(100)   |           | not null |
 application_id        | uuid                     |           |          |
 parcel_id             | uuid                     |           | not null |
 initiating_party_id   | uuid                     |           |          |
 receiving_party_id    | uuid                     |           |          |
 resulting_document_id | uuid                     |           |          |
 date_created          | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated          | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "transactions_pkey" PRIMARY KEY, btree (transaction_id)
    "idx_transactions_type_parcel" btree (transaction_type, parcel_id)
Foreign-key constraints:
    "transactions_application_id_fkey" FOREIGN KEY (application_id) REFERENCES applications(application_id)
    "transactions_initiating_party_id_fkey" FOREIGN KEY (initiating_party_id) REFERENCES parties(party_id)
    "transactions_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    "transactions_receiving_party_id_fkey" FOREIGN KEY (receiving_party_id) REFERENCES parties(party_id)
    "transactions_resulting_document_id_fkey" FOREIGN KEY (resulting_document_id) REFERENCES source_documents(document_id)
Triggers:
    trg_transactions_update_timestamp BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d surveys
                                  Table "public.surveys"
       Column        |           Type           | Collation | Nullable |      Default
---------------------+--------------------------+-----------+----------+-------------------
 survey_id           | uuid                     |           | not null | gen_random_uuid()
 parcel_id           | uuid                     |           | not null |
 surveyor_party_id   | uuid                     |           | not null |
 survey_date         | date                     |           | not null |
 survey_method       | character varying(100)   |           |          |
 survey_accuracy     | numeric(5,2)             |           |          |
 survey_notes        | text                     |           |          |
 related_document_id | uuid                     |           |          |
 date_created        | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated        | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "surveys_pkey" PRIMARY KEY, btree (survey_id)
    "idx_surveys_parcel_surveyor" btree (parcel_id, surveyor_party_id)
Foreign-key constraints:
    "surveys_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    "surveys_related_document_id_fkey" FOREIGN KEY (related_document_id) REFERENCES source_documents(document_id)
    "surveys_surveyor_party_id_fkey" FOREIGN KEY (surveyor_party_id) REFERENCES parties(party_id)
Triggers:
    trg_surveys_update_timestamp BEFORE UPDATE ON surveys FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d source_documents
                                 Table "public.source_documents"
          Column           |           Type           | Collation | Nullable |      Default
---------------------------+--------------------------+-----------+----------+-------------------
 document_id               | uuid                     |           | not null | gen_random_uuid()
 document_type             | character varying(100)   |           | not null |
 document_reference_number | character varying(255)   |           | not null |
 document_date             | date                     |           | not null |
 document_title            | character varying(255)   |           |          |
 document_path             | text                     |           |          |
 related_party_id          | uuid                     |           |          |
 parcel_id                 | uuid                     |           |          |
 date_created              | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated              | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "source_documents_pkey" PRIMARY KEY, btree (document_id)
    "idx_source_docs_type_ref" btree (document_type, document_reference_number)
    "source_documents_document_reference_number_key" UNIQUE CONSTRAINT, btree (document_reference_number)
Foreign-key constraints:
    "source_documents_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    "source_documents_related_party_id_fkey" FOREIGN KEY (related_party_id) REFERENCES parties(party_id)
Referenced by:
    TABLE "surveys" CONSTRAINT "surveys_related_document_id_fkey" FOREIGN KEY (related_document_id) REFERENCES source_documents(document_id)
    TABLE "transactions" CONSTRAINT "transactions_resulting_document_id_fkey" FOREIGN KEY (resulting_document_id) REFERENCES source_documents(document_id)
Triggers:
    trg_source_documents_update_timestamp BEFORE UPDATE ON source_documents FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d rrrs
                                  Table "public.rrrs"
     Column      |           Type           | Collation | Nullable |      Default
-----------------+--------------------------+-----------+----------+-------------------
 rrr_id          | uuid                     |           | not null | gen_random_uuid()
 rrr_type        | character varying(50)    |           | not null |
 description     | text                     |           | not null |
 valid_from_date | date                     |           | not null |
 valid_to_date   | date                     |           |          |
 party_id        | uuid                     |           | not null |
 parcel_id       | uuid                     |           | not null |
 date_created    | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated    | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "rrrs_pkey" PRIMARY KEY, btree (rrr_id)
    "idx_rrrs_type_party_parcel" btree (rrr_type, party_id, parcel_id)
Foreign-key constraints:
    "rrrs_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    "rrrs_party_id_fkey" FOREIGN KEY (party_id) REFERENCES parties(party_id)
Triggers:
    trg_rrrs_update_timestamp BEFORE UPDATE ON rrrs FOR EACH ROW EXECUTE FUNCTION update_timestamp()


parceldb=# \d registration_sections


                             Table "public.registration_sections"
         Column          |           Type           | Collation | Nullable |      Default
-------------------------+--------------------------+-----------+----------+-------------------
 registration_section_id | uuid                     |           | not null | gen_random_uuid()
 name                    | character varying(255)   |           | not null |
 admin_unit_id           | uuid                     |           | not null |
 date_created            | timestamp with time zone |           |          | CURRENT_TIMESTAMP
 date_updated            | timestamp with time zone |           |          | CURRENT_TIMESTAMP
Indexes:
    "registration_sections_pkey" PRIMARY KEY, btree (registration_section_id)
    "idx_reg_sections_admin_unit_id" btree (admin_unit_id)
Foreign-key constraints:
    "registration_sections_admin_unit_id_fkey" FOREIGN KEY (admin_unit_id) REFERENCES administrative_units(admin_unit_id)
Referenced by:
    TABLE "parcels" CONSTRAINT "fk_registration_section" FOREIGN KEY (registration_section_id) REFERENCES registration_sections(registration_section_id)
Triggers:
    trg_registration_sections_update_timestamp BEFORE UPDATE ON registration_sections FOR EACH ROW EXECUTE FUNCTION update_timestamp()

parceldb=# \d parcels
                                                Table "public.parcels"
          Column          |            Type             | Collation | Nullable |               Default
--------------------------+-----------------------------+-----------+----------+--------------------------------------
 old_gid                  | integer                     |           | not null | nextval('parcels_gid_seq'::regclass)
 old_id                   | integer                     |           |          |
 parcel_number            | character varying(254)      |           | not null |
 area_sqm                 | numeric                     |           |          |
 geom                     | geometry(MultiPolygon,4326) |           | not null |
 parcel_id                | uuid                        |           | not null |
 registration_section_id  | uuid                        |           |          |
 current_land_use_type_id | uuid                        |           |          |
 date_created             | timestamp with time zone    |           |          | CURRENT_TIMESTAMP
 date_updated             | timestamp with time zone    |           |          | CURRENT_TIMESTAMP
Indexes:
    "parcels_pkey" PRIMARY KEY, btree (parcel_id)
    "idx_parcels_current_land_use_type_id" btree (current_land_use_type_id)
    "idx_parcels_geometry" gist (geom)
    "idx_parcels_registration_section_id" btree (registration_section_id)
    "parcels_parcel_number_key" UNIQUE CONSTRAINT, btree (parcel_number)
Foreign-key constraints:
    "fk_land_use_type" FOREIGN KEY (current_land_use_type_id) REFERENCES land_use_types(land_use_type_id)
    "fk_registration_section" FOREIGN KEY (registration_section_id) REFERENCES registration_sections(registration_section_id)
Referenced by:
    TABLE "applications" CONSTRAINT "applications_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    TABLE "rrrs" CONSTRAINT "rrrs_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    TABLE "source_documents" CONSTRAINT "source_documents_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    TABLE "surveys" CONSTRAINT "surveys_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    TABLE "transactions" CONSTRAINT "transactions_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
    TABLE "valuations" CONSTRAINT "valuations_parcel_id_fkey" FOREIGN KEY (parcel_id) REFERENCES parcels(parcel_id)
Triggers:
    trg_parcels_update_timestamp BEFORE UPDATE ON parcels FOR EACH ROW EXECUTE FUNCTION update_timestamp()


