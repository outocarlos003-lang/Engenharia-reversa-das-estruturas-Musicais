/**
 * Links detected event-level transformations to provisional phrase and section hypotheses.
 * A relation is descriptive context, not proof of formal function.
 */
export function contextualizeTransformations(transformations=[],structure={}){
  const phrases=structure.phrases??[];
  const sections=structure.sections??[];
  const phraseFor=eventIds=>{
    const ids=new Set(eventIds??[]);
    const ranked=phrases.map(phrase=>{
      const overlap=(phrase.event_ids??[]).filter(id=>ids.has(id)).length;
      return {phrase,overlap,coverage:ids.size?overlap/ids.size:0};
    }).filter(item=>item.overlap>0).sort((a,b)=>b.coverage-a.coverage||b.overlap-a.overlap);
    const best=ranked[0];
    return best?{id:best.phrase.id,coverage:Number(best.coverage.toFixed(3)),boundary_status:best.phrase.boundary_status??'unknown'}:null;
  };
  const sectionFor=phraseId=>{
    if(!phraseId) return null;
    const section=sections.find(item=>(item.phrase_ids??[]).includes(phraseId)||(item.occurrences??[]).some(o=>o.phrase_id===phraseId));
    return section?{id:section.id,label:section.label??null}:null;
  };
  return transformations.map(item=>{
    const sourcePhrase=phraseFor(item.source?.event_ids);
    const targetPhrase=phraseFor(item.target?.event_ids);
    const sourceSection=sectionFor(sourcePhrase?.id);
    const targetSection=sectionFor(targetPhrase?.id);
    let relation_scope='unresolved';
    if(sourcePhrase&&targetPhrase){
      if(sourcePhrase.id===targetPhrase.id) relation_scope='within_phrase';
      else if(sourceSection&&targetSection&&sourceSection.id===targetSection.id) relation_scope='between_phrases_within_section';
      else if(sourceSection&&targetSection&&sourceSection.id!==targetSection.id) relation_scope='across_sections';
      else relation_scope='between_phrases_section_unresolved';
    } else if(sourcePhrase||targetPhrase) relation_scope='phrase_boundary_overlap_or_unresolved';
    return {
      ...item,
      structural_context:{
        source_phrase:sourcePhrase,
        target_phrase:targetPhrase,
        source_section:sourceSection,
        target_section:targetSection,
        relation_scope,
        evidence:{basis:['event-id overlap with provisional phrase segmentation','phrase membership in provisional section grouping']},
        limitations:[
          'Context depends on provisional phrase and section boundaries.',
          'A transformation crossing sections does not by itself establish recurrence, development, or a formal return.',
        ],
      },
    };
  });
}
