import {
  ITypeSyncer,
  ISyncResult,
  IPackageJSONService,
  ITypeDefinitionSource,
  ITypeDefinition,
  IPackageFile,
  ISyncOptions
} from "./types";
import { uniq, filterMap, mergeObjects, typed, orderObject } from "./util";

/**
 * Creates a type syncer.
 *
 * @param packageJSONservice
 * @param typeDefinitionSource
 */
export function createTypeSyncer(
  packageJSONService: IPackageJSONService,
  typeDefinitionSource: ITypeDefinitionSource
): ITypeSyncer {
  return {
    /**
     * Syncs typings in the specified package.json.
     */
    sync: async (
      filePath,
      opts: ISyncOptions = { dry: false, optional: false }
    ) => {
      const [file, allTypings] = await Promise.all([
        packageJSONService.readPackageFile(filePath),
        typeDefinitionSource.fetch()
      ]);

      const allPackageNames = uniq([
        ...((file.dependencies &&
          Object.keys(file.dependencies)) /* istanbul ignore next*/ ||
          []),
        ...((file.devDependencies &&
          Object.keys(file.devDependencies)) /* istanbul ignore next*/ ||
          [])
      ]);

      const newTypings = filterNewTypings(allPackageNames, allTypings);

      const deps = await Promise.all(
        newTypings.map(async t => {
          const latestVersion = await typeDefinitionSource.getLatestTypingsVersion(
            t.typingsName
          );
          return { [typed(t.typingsName)]: `^${latestVersion}` };
        })
      ).then(mergeObjects);

      const devDepsToAdd = !opts.optional ? deps : mergeObjects([]);
      const optDepsToAdd = opts.optional ? deps : mergeObjects([]);

      console.log(
        `Syncing Dependencies opt: ${opts.optional}, dev: ${devDepsToAdd}, opts: ${optDepsToAdd}`
      );

      if (!opts.dry) {
        await packageJSONService.writePackageFile(
          filePath,
          {
            ...file,
            optionalDependencies: orderObject({
              ...devDepsToAdd,
              ...file.optionalDependencies || []
            }),
            devDependencies: orderObject({
              ...devDepsToAdd,
              ...file.devDependencies
            })
          } as IPackageFile
        );
      }

      return {
        newTypings
      };
    }
  };
}

/**
 * Returns an array of new typings.
 *
 * @param allPackageNames Used to filter the typings that are new.
 * @param allTypings All typings available
 */
function filterNewTypings(
  allPackageNames: Array<string>,
  allTypings: Array<ITypeDefinition>
): Array<ITypeDefinition> {
  const existingTypings = allPackageNames.filter(x => x.startsWith("@types/"));
  return filterMap(allPackageNames, p => {
    const typingsForPackage = allTypings.find(x => x.typingsName === p);
    if (!typingsForPackage) {
      // No typings available.
      return false;
    }

    const fullTypingsPackage = typed(typingsForPackage.typingsName);
    const alreadyHasTyping = existingTypings.some(
      t => t === fullTypingsPackage
    );
    if (alreadyHasTyping) {
      return false;
    }

    return typingsForPackage;
  });
}
