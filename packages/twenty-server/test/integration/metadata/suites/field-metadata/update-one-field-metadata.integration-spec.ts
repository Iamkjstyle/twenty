import { createOneFieldMetadata } from 'test/integration/metadata/suites/field-metadata/utils/create-one-field-metadata.util';
import { updateOneFieldMetadata } from 'test/integration/metadata/suites/field-metadata/utils/update-one-field-metadata.util';
import {
  LISTING_NAME_PLURAL,
  LISTING_NAME_SINGULAR,
} from 'test/integration/metadata/suites/object-metadata/constants/test-object-names.constant';
import { createOneObjectMetadata } from 'test/integration/metadata/suites/object-metadata/utils/create-one-object-metadata.util';
import { deleteOneObjectMetadata } from 'test/integration/metadata/suites/object-metadata/utils/delete-one-object-metadata.util';
import { FieldMetadataType } from 'twenty-shared/types';

describe('updateOne', () => {
  describe('FieldMetadataService name/label sync', () => {
    let listingObjectId = '';
    let testFieldId = '';

    beforeEach(async () => {
      const { data } = await createOneObjectMetadata({
        input: {
          labelSingular: LISTING_NAME_SINGULAR,
          labelPlural: LISTING_NAME_PLURAL,
          nameSingular: LISTING_NAME_SINGULAR,
          namePlural: LISTING_NAME_PLURAL,
          icon: 'IconBuildingSkyscraper',
          isLabelSyncedWithName: true,
        },
      });

      listingObjectId = data.createOneObject.id;

      const { data: createdFieldMetadata } = await createOneFieldMetadata({
        input: {
          objectMetadataId: listingObjectId,
          type: FieldMetadataType.TEXT,
          name: 'testName',
          label: 'Test name',
          isLabelSyncedWithName: true,
        },
      });

      testFieldId = createdFieldMetadata.createOneField.id;
    });
    afterEach(async () => {
      await deleteOneObjectMetadata({
        input: { idToDelete: listingObjectId },
      });
    });

    it('should update a field name and label when they are synced correctly', async () => {
      // Arrange
      const updateFieldInput = {
        name: 'newName',
        label: 'New name',
        isLabelSyncedWithName: true,
      };

      // Act
      const { data } = await updateOneFieldMetadata({
        input: { idToUpdate: testFieldId, updatePayload: updateFieldInput },
        gqlFields: `
            id
            name
            label
            isLabelSyncedWithName
        `,
      });

      // Assert
      expect(data.updateOneField.name).toBe('newName');
    });

    it('should update a field name and label when they are not synced correctly and labelSync is false', async () => {
      // Arrange
      const updateFieldInput = {
        name: 'differentName',
        label: 'New name',
        isLabelSyncedWithName: false,
      };

      // Act
      const { data } = await updateOneFieldMetadata({
        input: { idToUpdate: testFieldId, updatePayload: updateFieldInput },
        gqlFields: `
              id
              name
              label
              isLabelSyncedWithName
          `,
      });

      // Assert
      expect(data.updateOneField.name).toBe('differentName');
    });

    it('should not update a field name if it is not synced correctly with label and labelSync is true', async () => {
      // Arrange
      const updateFieldInput = {
        name: 'newName',
        isLabelSyncedWithName: true,
      };

      // Act
      const { errors } = await updateOneFieldMetadata({
        input: { idToUpdate: testFieldId, updatePayload: updateFieldInput },
        gqlFields: `
              id
              name
              label
              isLabelSyncedWithName
          `,
        expectToFail: true,
      });

      // Assert
      expect(errors[0].message).toBe(
        'Name is not synced with label. Expected name: "testName", got newName',
      );
    });
  });

  describe('FieldMetadataService Enum Default Value Validation', () => {
    let createdObjectMetadataId: string;

    beforeEach(async () => {
      const { data: listingObjectMetadata } = await createOneObjectMetadata({
        input: {
          labelSingular: LISTING_NAME_SINGULAR,
          labelPlural: LISTING_NAME_PLURAL,
          nameSingular: LISTING_NAME_SINGULAR,
          namePlural: LISTING_NAME_PLURAL,
          icon: 'IconBuildingSkyscraper',
          isLabelSyncedWithName: true,
        },
      });

      createdObjectMetadataId = listingObjectMetadata.createOneObject.id;
    });

    afterEach(async () => {
      await deleteOneObjectMetadata({
        input: { idToDelete: createdObjectMetadataId },
      });
    });

    it('should throw an error if the default value is not in the options', async () => {
      const { data: createdFieldMetadata } = await createOneFieldMetadata({
        input: {
          objectMetadataId: createdObjectMetadataId,
          type: FieldMetadataType.SELECT,
          name: 'testName',
          label: 'Test name',
          isLabelSyncedWithName: true,
          options: [
            {
              label: 'Option 1',
              value: 'OPTION_1',
              color: 'green',
              position: 1,
            },
          ],
        },
      });

      const { errors } = await updateOneFieldMetadata({
        input: {
          idToUpdate: createdFieldMetadata.createOneField.id,
          updatePayload: {
            defaultValue: "'OPTION_2'",
          },
        },
        gqlFields: `
          id
          name
          label
          isLabelSyncedWithName
        `,
        expectToFail: true,
      });

      expect(errors).toMatchInlineSnapshot(`
[
  {
    "extensions": {
      "code": "BAD_USER_INPUT",
      "userFriendlyMessage": "Default value "'OPTION_2'" must be one of the option values",
    },
    "message": "Default value "'OPTION_2'" must be one of the option values",
    "name": "UserInputError",
  },
]
`);
    });
  });
});
